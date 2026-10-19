import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import fs from 'node:fs'

// Plugin to synchronize applications and boarder data across multiple devices (Mobile & PC)
function sharedApiPlugin(): Plugin {
  const dataDir = path.resolve(import.meta.dirname, './.data')
  const dataFile = path.resolve(dataDir, 'boarders.json')

  function getBoarders() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      if (fs.existsSync(dataFile)) {
        const text = fs.readFileSync(dataFile, 'utf-8')
        if (text) return JSON.parse(text)
      }
    } catch (e) {
      console.error('Error reading boarders.json:', e)
    }
    return null
  }

  function saveBoarders(data: any[]) {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('Error saving boarders.json:', e)
    }
  }

  const mealsFile = path.resolve(dataDir, 'meals.json')

  function getDhakaDateStrings() {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const dhaka = new Date(utc + 3600000 * 6)
    const todayStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}-${String(dhaka.getDate()).padStart(2, '0')}`
    const tomorrow = new Date(dhaka)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    return { todayStr, tomorrowStr }
  }

  function getMealsData() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      if (fs.existsSync(mealsFile)) {
        const text = fs.readFileSync(mealsFile, 'utf-8')
        if (text) return JSON.parse(text)
      }
    } catch (e) {
      console.error('Error reading meals.json:', e)
    }
    return {
      active_meals_today: 185,
      active_meals_tomorrow: 192,
      meal_attendance_rate: 76.5,
      estimated_monthly_meal_bill: 114500,
      selections: [],
      last_updated: new Date().toISOString(),
    }
  }

  function saveMealsData(data: any) {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(mealsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('Error saving meals.json:', e)
    }
  }

  return {
    name: 'shared-boarders-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]

        // 1. GET /api/boarders
        if (req.method === 'GET' && url === '/api/boarders') {
          const boarders = getBoarders()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(boarders || []))
          return
        }

        // 2. POST /api/boarders (Save new application from mobile or PC, or bulk sync)
        if (req.method === 'POST' && url === '/api/boarders') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              let boarders = getBoarders() || []

              if (Array.isArray(payload)) {
                boarders = payload
              } else if (payload && typeof payload === 'object') {
                const existingIdx = boarders.findIndex(
                  (b: any) => b.id === payload.id || b.boarder_code === payload.boarder_code
                )
                if (existingIdx >= 0) {
                  boarders[existingIdx] = { ...boarders[existingIdx], ...payload }
                } else {
                  boarders = [payload, ...boarders]
                }
              }

              saveBoarders(boarders)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, count: boarders.length, data: payload }))
            } catch (err: any) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // 3. POST /api/boarders/update (Approve or Reject status from mobile or PC)
        if (req.method === 'POST' && url === '/api/boarders/update') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const { boarderId, status, remarks } = JSON.parse(body)
              let boarders = getBoarders() || []
              const item = boarders.find((b: any) => b.id === boarderId)
              if (item) {
                item.status = status
                if (remarks) item.remarks = remarks
                item.updated_at = new Date().toISOString()
                saveBoarders(boarders)
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, boarder: item }))
            } catch (err: any) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // 4. GET /api/dashboard/metrics (Real-time live KPI metrics for PC & mobile)
        if (req.method === 'GET' && url === '/api/dashboard/metrics') {
          const mealsData = getMealsData()
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              active_meals_today: mealsData.active_meals_today ?? 185,
              active_meals_tomorrow: mealsData.active_meals_tomorrow ?? 192,
              meal_attendance_rate: mealsData.meal_attendance_rate ?? 76.5,
              estimated_monthly_meal_bill: mealsData.estimated_monthly_meal_bill ?? 114500,
              last_updated: mealsData.last_updated || new Date().toISOString(),
            })
          )
          return
        }

        // 5. GET /api/meals
        if (req.method === 'GET' && url === '/api/meals') {
          const mealsData = getMealsData()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(mealsData))
          return
        }

        // 6. POST /api/meals/toggle (Toggle single meal session from mobile or PC)
        if (req.method === 'POST' && url === '/api/meals/toggle') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const { boarderId, mealDate, session, newState, overrideReason } = JSON.parse(body)
              const mealsData = getMealsData()
              const { todayStr, tomorrowStr } = getDhakaDateStrings()

              if (!Array.isArray(mealsData.selections)) {
                mealsData.selections = []
              }

              const targetId = boarderId || 'bdr-101'
              const sessionKey = session.toLowerCase()
              let item = mealsData.selections.find(
                (s: any) => s.boarder_id === targetId && s.meal_date === mealDate
              )

              let oldState = true
              if (!item) {
                item = {
                  id: `ms-${targetId}-${mealDate}`,
                  boarder_id: targetId,
                  flat_id: 'flat-2a',
                  meal_date: mealDate,
                  breakfast: true,
                  lunch: true,
                  dinner: true,
                  is_locked: false,
                  is_override: !!overrideReason,
                  override_reason: overrideReason || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                mealsData.selections.push(item)
              } else {
                oldState = item[sessionKey] ?? true
              }

              item[sessionKey] = newState
              item.updated_at = new Date().toISOString()
              if (overrideReason) {
                item.is_override = true
                item.override_reason = overrideReason
              }

              // Update live counters if state changed
              if (oldState !== newState) {
                const delta = newState ? 1 : -1
                if (mealDate === todayStr) {
                  mealsData.active_meals_today = Math.max(0, (mealsData.active_meals_today ?? 185) + delta)
                  mealsData.meal_attendance_rate =
                    Math.round((mealsData.active_meals_today / 294) * 1000) / 10
                } else if (mealDate === tomorrowStr) {
                  mealsData.active_meals_tomorrow = Math.max(
                    0,
                    (mealsData.active_meals_tomorrow ?? 192) + delta
                  )
                }
              }

              mealsData.last_updated = new Date().toISOString()
              saveMealsData(mealsData)

              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  selection: item,
                  metrics: {
                    active_meals_today: mealsData.active_meals_today,
                    active_meals_tomorrow: mealsData.active_meals_tomorrow,
                    meal_attendance_rate: mealsData.meal_attendance_rate,
                    estimated_monthly_meal_bill: mealsData.estimated_monthly_meal_bill,
                  },
                })
              )
            } catch (err: any) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // 7. POST /api/meals/batch (Batch toggle all meals for a date from mobile or PC)
        if (req.method === 'POST' && url === '/api/meals/batch') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const { boarderId, mealDate, breakfast, lunch, dinner, overrideReason } = JSON.parse(body)
              const mealsData = getMealsData()
              const { todayStr, tomorrowStr } = getDhakaDateStrings()

              if (!Array.isArray(mealsData.selections)) {
                mealsData.selections = []
              }

              const targetId = boarderId || 'bdr-101'
              let item = mealsData.selections.find(
                (s: any) => s.boarder_id === targetId && s.meal_date === mealDate
              )

              const oldB = item ? (item.breakfast ?? true) : true
              const oldL = item ? (item.lunch ?? true) : true
              const oldD = item ? (item.dinner ?? true) : true

              if (!item) {
                item = {
                  id: `ms-${targetId}-${mealDate}`,
                  boarder_id: targetId,
                  flat_id: 'flat-2a',
                  meal_date: mealDate,
                  breakfast: true,
                  lunch: true,
                  dinner: true,
                  is_locked: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                mealsData.selections.push(item)
              }

              let delta = 0
              if (breakfast !== undefined) {
                delta += (breakfast ? 1 : 0) - (oldB ? 1 : 0)
                item.breakfast = breakfast
              }
              if (lunch !== undefined) {
                delta += (lunch ? 1 : 0) - (oldL ? 1 : 0)
                item.lunch = lunch
              }
              if (dinner !== undefined) {
                delta += (dinner ? 1 : 0) - (oldD ? 1 : 0)
                item.dinner = dinner
              }

              item.updated_at = new Date().toISOString()
              if (overrideReason) {
                item.is_override = true
                item.override_reason = overrideReason
              }

              if (delta !== 0) {
                if (mealDate === todayStr) {
                  mealsData.active_meals_today = Math.max(0, (mealsData.active_meals_today ?? 185) + delta)
                  mealsData.meal_attendance_rate =
                    Math.round((mealsData.active_meals_today / 294) * 1000) / 10
                } else if (mealDate === tomorrowStr) {
                  mealsData.active_meals_tomorrow = Math.max(
                    0,
                    (mealsData.active_meals_tomorrow ?? 192) + delta
                  )
                }
              }

              mealsData.last_updated = new Date().toISOString()
              saveMealsData(mealsData)

              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  selection: item,
                  metrics: {
                    active_meals_today: mealsData.active_meals_today,
                    active_meals_tomorrow: mealsData.active_meals_tomorrow,
                    meal_attendance_rate: mealsData.meal_attendance_rate,
                  },
                })
              )
            } catch (err: any) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sharedApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Bachelor Home',
        short_name: 'Bachelor Home',
        description: 'Comprehensive Bachelor Home, Mess & Hostel Management ERP',
        theme_color: '#0f172a',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
