import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar.tsx'
import Footer from './components/Footer.tsx'
import Home from './pages/Home.tsx'
import Products from './pages/Products.tsx'
import About from './pages/About.tsx'
import Login from './pages/Login.tsx'
import Signup from './pages/Signup.tsx'
import NotFound from './pages/NotFound.tsx'
import ProductDetail from './pages/ProductDetail.tsx'
import ChatWidget from './components/ChatWidget.tsx'
import AssistantResults from './components/AssistantResults.tsx'

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="main">
        <AssistantResults />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
