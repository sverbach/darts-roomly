import { createFileRoute } from '@tanstack/react-router'
import type { AppRouter } from '../../../darts-roomly-api/src/index.ts'
import {
  Zap,
  Server,
  Route as RouteIcon,
  Shield,
  Waves,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div><h1>Hello world</h1></div>
  )
}
