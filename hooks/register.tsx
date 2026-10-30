import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { SCENES, render } from './scenes'

const scene = atom({ plugin: 'ascii-scenes', key: 'scene' } as const, 'cat')
const isHidden = atom({ plugin: 'ascii-scenes', key: 'isHidden' } as const, false)
const isAuto = atom({ plugin: 'ascii-scenes', key: 'isAuto' } as const, false)
const size = atom({ plugin: 'ascii-scenes', key: 'size' } as const, 1)

const SIZES = [6, 8, 10]
const TICK_MS = 200 // 5 frames a second; the engine folds redraws above ten a second
const AUTO_EVERY = 600 // frames (about two minutes)

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim()

const indexOf = (id: string) => Math.max(0, SCENES.findIndex(s => s.id === id))
const step = (id: string, d: number) =>
  SCENES[(indexOf(id) + d + SCENES.length) % SCENES.length].id

const listText = () =>
  'ASCII scenes: ' +
  SCENES.map(s => `${s.id} (${s.label})`).join(', ') +
  '\n/scene <name> | next | prev | auto | size | off | on'

export const register: Register = on => {
  let frame = 0
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: 'Change the animated ASCII scene above the prompt',
      argumentHint: '[name|next|prev|auto|size|off|on]',
    })
    timer?.cancel()
    timer = $.clock.every(TICK_MS, () => {
      frame += 1
      if (frame % AUTO_EVERY === 0) {
        void read($, isAuto).then(auto => {
          if (auto) void update($, scene, id => step(id, 1))
        })
      }
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const arg = norm(e.args)

    if (arg === '' || arg === 'list') return { text: listText() }
    if (arg === 'next' || arg === 'prev') {
      const id = await update($, scene, cur => step(cur, arg === 'next' ? 1 : -1))
      await update($, isHidden, () => false)

      return { text: `Scene: ${SCENES[indexOf(id)].label}` }
    }
    if (arg === 'off') {
      await update($, isHidden, () => true)

      return { text: 'ASCII scenes hidden. /scene on to show them again.' }
    }
    if (arg === 'on') {
      await update($, isHidden, () => false)

      return { text: 'ASCII scenes shown.' }
    }
    if (arg === 'auto') {
      const auto = await update($, isAuto, v => !v)

      return { text: auto ? 'Auto-rotate on (every ~2 min).' : 'Auto-rotate off.' }
    }
    if (arg === 'size') {
      const n = await update($, size, v => (v + 1) % SIZES.length)

      return { text: `Height: ${SIZES[n]} rows.` }
    }
    const hit = SCENES.find(s => norm(s.id) === arg || norm(s.label) === arg)
    if (!hit) return { text: `Unknown scene "${e.args.trim()}".\n${listText()}` }
    await update($, scene, () => hit.id)
    await update($, isHidden, () => false)

    return { text: `Scene: ${hit.label}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)

    if (await read($, isHidden)) {
      return (
        <Box>
          <Button
            key="show"
            label="show ascii scenes"
            onPress={() => update($, isHidden, () => false)}
          />
        </Box>
      )
    }

    const id = await read($, scene)
    const auto = await read($, isAuto)
    const rows = Math.max(
      5,
      Math.min(SIZES[await read($, size)] ?? 8, e.props.maxRows - 1),
    )
    const cols = Math.max(24, Math.min(e.props.bodyColumns, 110))
    const grid = render(id, frame, cols, rows, { working: e.props.isWorking })
    const label = SCENES[indexOf(id)].label

    return (
      <Box flexDirection="column">
        {grid.map(row => (
          <Text wrap="truncate-end">
            {row.map(run => (
              <Text color={run.color}>{run.text}</Text>
            ))}
          </Text>
        ))}
        <Box>
          <Button key="prev" label="< prev" onPress={() => update($, scene, cur => step(cur, -1))} />
          <Text> {label} </Text>
          <Button key="next" label="next >" onPress={() => update($, scene, cur => step(cur, 1))} />
          <Text dimColor>  </Text>
          <Button key="size" label="size" onPress={() => update($, size, v => (v + 1) % SIZES.length)} />
          <Text> </Text>
          <Button key="auto" label={auto ? 'auto: on' : 'auto: off'} onPress={() => update($, isAuto, v => !v)} />
          <Text> </Text>
          <Button key="hide" label="hide" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
