import { base, baseSepolia, Chain, mainnet } from 'wagmi/chains'

export type NetworkInfo = {
  id: string
  name: string
  chain: Chain
}

export const mainnetNetwork: NetworkInfo = {
  id: 'mainnet',
  name: 'Ethereum Mainnet',
  chain: mainnet,
}

export const baseNetwork: NetworkInfo = {
  id: 'base',
  name: 'Base',
  chain: base,
}

export const baseSepoliaNetwork: NetworkInfo = {
  id: 'base-sepolia',
  name: 'Base Sepolia',
  chain: baseSepolia,
}

export const networks: NetworkInfo[] = [
  mainnetNetwork,
  baseNetwork,
  baseSepoliaNetwork,
]

export type WalletId = 'metamask' | 'okx' | 'phantom'

export interface WalletInfo {
  id: WalletId
  name: string
}

export const wallets: WalletInfo[] = [
  { id: 'metamask', name: 'MetaMask' },
  { id: 'okx', name: 'OKX Wallet' },
  { id: 'phantom', name: 'Phantom' },
]

export const walletConnectorIds: Record<WalletId, string> = {
  metamask: 'io.metamask',
  okx: 'com.okex.wallet',
  phantom: 'app.phantom',
}

export const walletNetworkCompatibility: Record<WalletId, NetworkInfo[]> = {
  metamask: [mainnetNetwork, baseNetwork, baseSepoliaNetwork],
  okx: [mainnetNetwork, baseNetwork, baseSepoliaNetwork],
  phantom: [mainnetNetwork],
}

export const getCompatibleWallets = (networkId: string): WalletInfo[] => {
  return wallets.filter((wallet) =>
    walletNetworkCompatibility[wallet.id].some(
      (network) => network.id === networkId
    )
  )
}
