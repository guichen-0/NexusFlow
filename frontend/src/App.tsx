import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import Home from './pages/Home'
import Workflows from './pages/Workflows'
import WorkflowEditor from './pages/WorkflowEditor'
import Tasks from './pages/Tasks'
import Agents from './pages/Agents'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/:id" element={<WorkflowEditor />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
