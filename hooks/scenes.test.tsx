import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'ascii-scenes',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 14,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 14 },
    view: {},
  },
} as const

test('the band draws a scene and its controls, on terminal and desktop', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'scene' } }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ key: 'next' })).toBeDefined()
    expect(await ui.find({ key: 'prev' })).toBeDefined()
    expect(await ui.find({ key: 'hide' })).toBeDefined()
    await ui.unmount()
  }
})

test('a survey keeps the band quiet', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, hasSurvey: true },
    surface: 'desktop',
  })

  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})
