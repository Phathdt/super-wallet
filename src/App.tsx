import '@rainbow-me/rainbowkit/styles.css'

import { http } from 'viem'
import { createConfig, WagmiProvider } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'

import { Toaster } from '@/components/ui/toaster'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import WalletConnector from './WalletConnector'

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID
console.log('🚀 ~ projectId:', projectId)

if (!projectId) {
  throw new Error('VITE_WALLET_CONNECT_PROJECT_ID is not defined')
}

const queryClient = new QueryClient()

const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [],
})

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="min-h-screen bg-background">
            <main className="container mx-auto py-8">
              <WalletConnector />
            </main>
          </div>
          <Toaster />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
