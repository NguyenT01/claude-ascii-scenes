export type SceneId = string

declare module 'claude-code' {
  interface PluginState {
    'ascii-scenes': {
      scene: SceneId
      isHidden: boolean
      isAuto: boolean
      size: number
    }
  }
}
