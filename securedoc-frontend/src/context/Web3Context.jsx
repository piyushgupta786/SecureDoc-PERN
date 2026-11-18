import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

const Web3Context = createContext(null)

const GANACHE_RPC = 'http://127.0.0.1:7545'
const GANACHE_CHAIN_ID = 1337

// ABI path relative — will be fetched from public folder
const ABI_URL = '/SecureDocRegistry.json'

export function Web3Provider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null)
  const [networkStatus, setNetworkStatus] = useState('Checking...')
  const [contractAddress, setContractAddress] = useState('')
  const [contract, setContract] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [abiData, setAbiData] = useState(null)

  // Load ABI from public folder
  useEffect(() => {
    fetch(ABI_URL)
      .then(r => r.json())
      .then(data => setAbiData(data))
      .catch(() => console.warn('SecureDocRegistry ABI not found in public/'))
  }, [])

  // Check Ganache status on mount
  useEffect(() => {
    checkGanacheStatus()
  }, [abiData])

  async function checkGanacheStatus() {
    try {
      const p = new ethers.JsonRpcProvider(GANACHE_RPC)
      const network = await p.getNetwork()
      if (Number(network.chainId) === GANACHE_CHAIN_ID) {
        setNetworkStatus('Ganache #1337 — Connected')
        setIsConnected(true)
        setProvider(p)
        // Try to load contract
        const storedAddr = import.meta.env.VITE_CONTRACT_ADDRESS || ''
        if (storedAddr && abiData?.abi) {
          const c = new ethers.Contract(storedAddr, abiData.abi, p)
          setContract(c)
          setContractAddress(storedAddr)
        }
      } else {
        setNetworkStatus('Wrong network')
        setIsConnected(false)
      }
    } catch {
      setNetworkStatus('Ganache — Offline')
      setIsConnected(false)
    }
  }

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkStatus('MetaMask not installed')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(chainId, 16) !== GANACHE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + GANACHE_CHAIN_ID.toString(16) }],
          })
        } catch {
          setNetworkStatus('Switch to Ganache #1337 in MetaMask')
          return
        }
      }
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      setWalletAddress(accounts[0])
      setNetworkStatus('MetaMask — Ganache #1337')
      setIsConnected(true)
      setProvider(browserProvider)
      if (contractAddress && abiData?.abi) {
        const c = new ethers.Contract(contractAddress, abiData.abi, signer)
        setContract(c)
      }
    } catch (err) {
      console.error('Wallet connect error:', err)
      setNetworkStatus('Connection rejected')
    }
  }, [contractAddress, abiData])

  const verifyOnChain = useCallback(async (documentId, sha256Hex) => {
    if (!contract) return null
    try {
      const bytes32Hash = '0x' + sha256Hex.padStart(64, '0')
      return await contract.verifyDocument(documentId, bytes32Hash)
    } catch (err) {
      console.error('On-chain verify error:', err)
      return null
    }
  }, [contract])

  return (
    <Web3Context.Provider value={{
      walletAddress,
      networkStatus,
      contractAddress,
      isConnected,
      contract,
      provider,
      connectWallet,
      verifyOnChain,
      checkGanacheStatus,
    }}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error('useWeb3 must be used within Web3Provider')
  return ctx
}
