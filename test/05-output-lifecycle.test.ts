import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from 'koishi'

import { getConfiguredOutputFormats, guardPuppeteerOutput, type OutputConfig } from '../src/output.ts'

const imageOnlyConfig: OutputConfig = {
  sendText: false,
  sendImage: true,
  sendImageSvg: false,
  sendForward: false,
}

function createContext(puppeteer?: object) {
  const warnings: string[] = []
  const ctx = {
    puppeteer,
    logger: {
      warn(message: string) {
        warnings.push(message)
      },
    },
  } as unknown as Context
  return { ctx, warnings }
}

test('Puppeteer output is selected from config even before the service is ready', () => {
  const formats = getConfiguredOutputFormats(imageOnlyConfig)
  assert.deepEqual(formats.map(({ key }) => key), ['sendImage'])
})

test('image-only commands stop with a clear message when Puppeteer is unavailable', async () => {
  const { ctx, warnings } = createContext()
  const messages: string[] = []
  const shouldContinue = await guardPuppeteerOutput(ctx, imageOnlyConfig, {
    async send(message) {
      messages.push(message)
    },
  })

  assert.equal(shouldContinue, false)
  assert.equal(warnings.length, 1)
  assert.match(messages[0], /Puppeteer 服务当前不可用/)
})

test('other configured outputs continue when Puppeteer is unavailable', async () => {
  const { ctx } = createContext()
  const messages: string[] = []
  const shouldContinue = await guardPuppeteerOutput(ctx, {
    ...imageOnlyConfig,
    sendText: true,
  }, {
    async send(message) {
      messages.push(message)
    },
  })

  assert.equal(shouldContinue, true)
  assert.deepEqual(messages, [])
})

test('Puppeteer output continues normally after the service is ready', async () => {
  const { ctx, warnings } = createContext({})
  const shouldContinue = await guardPuppeteerOutput(ctx, imageOnlyConfig, {
    async send() {},
  })

  assert.equal(shouldContinue, true)
  assert.deepEqual(warnings, [])
})
