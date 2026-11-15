// Read-only access to another process's named shared memory (Windows). The mapping is opened,
// never created: if the game is not running, open() returns null.
import koffi from 'koffi'

const FILE_MAP_READ = 0x0004

interface K32 {
  OpenFileMappingW(access: number, inherit: number, name: string): unknown
  MapViewOfFile(handle: unknown, access: number, hi: number, lo: number, size: number): unknown
  UnmapViewOfFile(view: unknown): number
  CloseHandle(handle: unknown): number
}

let k32: K32 | null | undefined

function kernel(): K32 | null {
  if (k32 !== undefined) return k32
  if (process.platform !== 'win32') return (k32 = null)
  try {
    const lib = koffi.load('kernel32.dll')
    k32 = {
      OpenFileMappingW: lib.func('void* __stdcall OpenFileMappingW(uint32_t access, int inherit, str16 name)'),
      MapViewOfFile: lib.func('void* __stdcall MapViewOfFile(void* handle, uint32_t access, uint32_t hi, uint32_t lo, size_t size)'),
      UnmapViewOfFile: lib.func('int __stdcall UnmapViewOfFile(void* view)'),
      CloseHandle: lib.func('int __stdcall CloseHandle(void* handle)')
    } as K32
  } catch {
    k32 = null
  }
  return k32
}

export class SharedMemory {
  /** live view of the mapping: reads always see the game's current bytes */
  readonly buf: Buffer
  private handle: unknown
  private view: unknown

  private constructor(handle: unknown, view: unknown, size: number) {
    this.handle = handle
    this.view = view
    this.buf = Buffer.from(koffi.view(view, size))
  }

  static open(name: string, size: number): SharedMemory | null {
    const k = kernel()
    if (!k) return null
    const handle = k.OpenFileMappingW(FILE_MAP_READ, 0, name)
    if (!handle) return null
    const view = k.MapViewOfFile(handle, FILE_MAP_READ, 0, 0, size)
    if (!view) {
      k.CloseHandle(handle)
      return null
    }
    return new SharedMemory(handle, view, size)
  }

  close() {
    const k = kernel()
    if (!k || !this.view) return
    k.UnmapViewOfFile(this.view)
    k.CloseHandle(this.handle)
    this.view = this.handle = null
  }
}

/** UTF-16LE fixed-size string field */
export const wstr = (b: Buffer, off: number, chars: number): string => b.toString('utf16le', off, off + chars * 2).split('\0')[0].trim()
/** UTF-8 fixed-size string field */
export const cstr = (b: Buffer, off: number, len: number): string => {
  const end = b.indexOf(0, off)
  return b.toString('utf8', off, end >= off && end < off + len ? end : off + len).trim()
}
