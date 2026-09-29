import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MotionConfig } from 'framer-motion'
import './styles.css'
import './polish.css'
import './mobile.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
  </StrictMode>,
)
