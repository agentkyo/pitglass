// PitGlass.exe: the tray icon. It starts the PitGlass server (node src\server\main.ts) without a
// console window, keeps it running, and offers: open the control panel, restart, start with
// Windows, quit. Built by scripts\build-tray.cmd with the C# compiler that ships with Windows
// (.NET Framework 4), so it sticks to C# 5.
using System;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("PitGlass")]
[assembly: AssemblyProduct("PitGlass")]
[assembly: AssemblyDescription("Live sim dashboards on any phone or tablet")]
[assembly: AssemblyVersion("0.2.0.0")]

static class Program
{
    const int Port = 47830;
    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    const string RunName = "PitGlass";

    static readonly bool Pt = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "pt";
    static readonly string Root = Path.GetDirectoryName(Application.ExecutablePath);
    static readonly string Home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PitGlass");
    static readonly string LogFile = Path.Combine(Home, "pitglass.log");
    static readonly string Url = "http://localhost:" + Port;

    static NotifyIcon tray;
    static MenuItem autoItem;
    static Process server;
    static StreamWriter log;
    static System.Windows.Forms.Timer watch;
    static bool quitting;
    static bool openWhenUp;
    static int failures;
    static DateTime startedAt;
    static DateTime retryAt = DateTime.MinValue;
    static string state = "";

    static string T(string en, string pt) { return Pt ? pt : en; }

    [STAThread]
    static void Main(string[] args)
    {
        bool startup = Array.IndexOf(args, "--startup") >= 0;
        if (Array.IndexOf(args, "--autostart") >= 0) SetAutostart(true);

        bool first;
        using (Mutex one = new Mutex(true, "PitGlassTray", out first))
        {
            if (!first)
            {
                // already in the tray: a second launch just opens the control panel
                if (!startup) OpenPanel();
                return;
            }
            Application.EnableVisualStyles();
            Directory.CreateDirectory(Home);
            try { log = new StreamWriter(LogFile, false) { AutoFlush = true }; } catch { log = null; }
            StartMenuShortcut();

            ContextMenu menu = new ContextMenu();
            MenuItem open = new MenuItem(T("Open control panel", "Abrir painel de controle"), delegate { OpenPanel(); });
            open.DefaultItem = true;
            menu.MenuItems.Add(open);
            menu.MenuItems.Add(new MenuItem(T("Restart PitGlass", "Reiniciar o PitGlass"), delegate { Restart(); }));
            menu.MenuItems.Add("-");
            autoItem = new MenuItem(T("Start with Windows", "Iniciar com o Windows"), delegate { SetAutostart(!autoItem.Checked); autoItem.Checked = IsAutostart(); });
            autoItem.Checked = IsAutostart();
            menu.MenuItems.Add(autoItem);
            menu.MenuItems.Add(new MenuItem(T("Shortcut on the desktop", "Atalho na área de trabalho"), delegate { Shortcut(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)); }));
            menu.MenuItems.Add(new MenuItem(T("Open the log", "Abrir o log"), delegate { Shell(LogFile); }));
            menu.MenuItems.Add("-");
            menu.MenuItems.Add(new MenuItem(T("Quit", "Sair"), delegate { Quit(); }));

            tray = new NotifyIcon();
            tray.Icon = SmallIcon();
            tray.ContextMenu = menu;
            tray.Visible = true;
            tray.DoubleClick += delegate { OpenPanel(); };
            SetState(T("starting", "iniciando"));

            openWhenUp = !startup;
            watch = new System.Windows.Forms.Timer();
            watch.Interval = 1500;
            watch.Tick += delegate { Tick(); };
            watch.Start();
            Tick();

            Application.Run();
            GC.KeepAlive(one);
        }
    }

    // ---------------------------------------------------------------- the server process
    static bool PortOpen()
    {
        try
        {
            using (TcpClient c = new TcpClient())
            {
                IAsyncResult r = c.BeginConnect("127.0.0.1", Port, null, null);
                bool ok = r.AsyncWaitHandle.WaitOne(300) && c.Connected;
                if (ok) c.EndConnect(r);
                return ok;
            }
        }
        catch { return false; }
    }

    static void Tick()
    {
        if (quitting) return;
        bool up = PortOpen();
        bool ours = server != null && !server.HasExited;
        if (up)
        {
            SetState(ours ? T("running", "rodando") : T("running (started outside the tray)", "rodando (aberto fora da bandeja)"));
            if (ours && (DateTime.Now - startedAt).TotalSeconds > 20) failures = 0;
            if (openWhenUp) { openWhenUp = false; OpenPanel(); }
            return;
        }
        if (ours) return; // still starting
        if (server != null)
        {
            // it stopped by itself: try again, slower each time
            Log("server exited with code " + server.ExitCode);
            server.Dispose();
            server = null;
            failures++;
            retryAt = DateTime.Now.AddSeconds(Math.Min(60, 3 * failures));
            if (failures == 3) tray.ShowBalloonTip(8000, "PitGlass", T("The server keeps stopping. See the log in the tray menu.", "O servidor continua parando. Veja o log no menu da bandeja."), ToolTipIcon.Warning);
        }
        if (DateTime.Now < retryAt) { SetState(T("stopped, trying again", "parado, tentando de novo")); return; }
        Start();
    }

    static void Start()
    {
        try
        {
            bool ready = File.Exists(Path.Combine(Root, "dist", "web", "index.html")) && Directory.Exists(Path.Combine(Root, "node_modules"));
            ProcessStartInfo si = new ProcessStartInfo();
            si.WorkingDirectory = Root;
            si.UseShellExecute = false;
            si.CreateNoWindow = true;
            si.RedirectStandardOutput = true;
            si.RedirectStandardError = true;
            if (ready)
            {
                si.FileName = "node.exe";
                si.Arguments = "src\\server\\main.ts";
            }
            else
            {
                // first run: install and build, then start
                SetState(T("first run: installing", "primeira vez: instalando"));
                si.FileName = Environment.GetEnvironmentVariable("ComSpec") ?? "cmd.exe";
                si.Arguments = "/d /c \"npm install --no-fund --no-audit && node scripts\\build.mjs && node src\\server\\main.ts\"";
            }
            Process p = new Process();
            p.StartInfo = si;
            p.OutputDataReceived += delegate (object s, DataReceivedEventArgs e) { Log(e.Data); };
            p.ErrorDataReceived += delegate (object s, DataReceivedEventArgs e) { Log(e.Data); };
            p.Start();
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            server = p;
            startedAt = DateTime.Now;
            Log("started " + si.FileName + " " + si.Arguments);
        }
        catch (Exception e)
        {
            Log("cannot start: " + e.Message);
            failures++;
            retryAt = DateTime.Now.AddSeconds(30);
            SetState(T("Node.js not found", "Node.js não encontrado"));
            if (failures == 1) tray.ShowBalloonTip(10000, "PitGlass", T("Node.js 24 or newer is required: nodejs.org", "É preciso ter o Node.js 24 ou mais novo: nodejs.org"), ToolTipIcon.Error);
        }
    }

    static void Stop()
    {
        Process p = server;
        server = null;
        if (p == null) return;
        try
        {
            if (!p.HasExited)
            {
                // /t takes the whole tree: on a first run the server is a child of cmd.exe
                ProcessStartInfo k = new ProcessStartInfo("taskkill.exe", "/pid " + p.Id + " /t /f");
                k.UseShellExecute = false;
                k.CreateNoWindow = true;
                using (Process kp = Process.Start(k)) kp.WaitForExit(4000);
                p.WaitForExit(3000);
            }
        }
        catch { }
        p.Dispose();
    }

    static void Restart()
    {
        if (server == null && PortOpen())
        {
            MessageBox.Show(T("This PitGlass was not started by the tray icon. Close the window it runs in, and the tray starts it again.", "Este PitGlass não foi aberto pelo ícone da bandeja. Feche a janela em que ele roda, e a bandeja o inicia de novo."), "PitGlass");
            return;
        }
        Stop();
        failures = 0;
        retryAt = DateTime.MinValue;
        SetState(T("restarting", "reiniciando"));
    }

    static void Quit()
    {
        quitting = true;
        watch.Stop();
        Stop();
        tray.Visible = false;
        tray.Dispose();
        Application.Exit();
    }

    // ---------------------------------------------------------------- small things
    static void Log(string line)
    {
        if (line == null || log == null) return;
        lock (log)
        {
            try { log.WriteLine(DateTime.Now.ToString("HH:mm:ss") + " " + line); } catch { }
        }
    }

    static void SetState(string s)
    {
        if (s == state) return;
        state = s;
        string text = "PitGlass: " + s;
        tray.Text = text.Length > 63 ? text.Substring(0, 63) : text;
    }

    static void Shell(string target)
    {
        try { Process.Start(new ProcessStartInfo(target) { UseShellExecute = true }); } catch { }
    }

    static void OpenPanel()
    {
        Shell(Url);
    }

    static Icon SmallIcon()
    {
        try { return new Icon(Path.Combine(Root, "tray", "pitglass.ico"), SystemInformation.SmallIconSize); }
        catch
        {
            try { return Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { return SystemIcons.Application; }
        }
    }

    static string RunCommand()
    {
        return "\"" + Application.ExecutablePath + "\" --startup";
    }

    static bool IsAutostart()
    {
        try
        {
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(RunKey))
                return k != null && string.Equals(k.GetValue(RunName) as string, RunCommand(), StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }

    static void SetAutostart(bool on)
    {
        try
        {
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(RunKey))
            {
                if (on) k.SetValue(RunName, RunCommand());
                else k.DeleteValue(RunName, false);
            }
        }
        catch { }
    }

    /// <summary>PitGlass.lnk in a folder, pointing at this exe.</summary>
    static void Shortcut(string folder)
    {
        try
        {
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            dynamic link = shell.CreateShortcut(Path.Combine(folder, "PitGlass.lnk"));
            link.TargetPath = Application.ExecutablePath;
            link.WorkingDirectory = Root;
            link.Description = T("Live sim dashboards on any phone or tablet", "Painéis de simulador ao vivo em qualquer celular ou tablet");
            link.Save();
        }
        catch (Exception e) { Log("shortcut: " + e.Message); }
    }

    /// <summary>The Start menu entry, made once (and again if the folder moved).</summary>
    static void StartMenuShortcut()
    {
        string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        string mark = Path.Combine(Home, "shortcut.txt");
        try
        {
            if (File.Exists(mark) && File.ReadAllText(mark) == Application.ExecutablePath) return;
            Shortcut(programs);
            File.WriteAllText(mark, Application.ExecutablePath);
        }
        catch { }
    }
}
