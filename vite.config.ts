/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tests run in plain node, with no DOM.
  //
  // Everything worth unit-testing here is already pure: every file in src/lib
  // imports from ./supabase with `import type` only, none of them import React,
  // and none of them call new Date(). So a test is a function call against an
  // object literal -- no jsdom, no mocks, no fake timers, and nothing to keep
  // in step with the real client.
  //
  // The exception is transactionFile.ts, which needs DOMParser and
  // DecompressionStream to read an .xlsx. Its pure half (parseDelimited,
  // detectDelimiter, excelSerialToISO) is tested here; the zip reader is not,
  // and readTransactions() takes an already-parsed grid precisely so the import
  // brain can be tested without a browser.
  test: {
    include: ['src/**/*.test.ts'],
  },
})
