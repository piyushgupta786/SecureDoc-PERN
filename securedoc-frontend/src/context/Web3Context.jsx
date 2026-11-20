import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

const Web3Context = createContext(null)

const SEPOLIA_RPC = (import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com').trim()
const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_CHAIN_HEX = '0xaa36a7'
const ABI_URL = '/SecureDocRegistry.json'

export function Web3Provider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null)
  const [networkStatus, setNetworkStatus] = useState('Connecting Sepolia...')
  const [contractAddress, setContractAddress] = useState('')
  const [contract, setContract] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [abiData, setAbiData] = useState(null)

  useEffect(() => {
    fetch(ABI_URL)
      .then(r => r.json())
      .then(data => setAbiData(data))
      .catch(() => console.warn('SecureDocRegistry ABI not found in public/'))
  }, [])

  const checkNetworkStatus = useCallback(async () => {
    try {
      const p = new ethers.JsonRpcProvider(SEPOLIA_RPC)
      const network = await p.getNetwork()
      if (Number(network.chainId) === SEPOLIA_CHAIN_ID) {
        setNetworkStatus('Sepolia #11155111 — Connected')
        setIsConnected(true)
        setProvider(p)
        const storedAddr = (import.meta.env.VITE_CONTRACT_ADDRESS || '').trim()
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
      setNetworkStatus('Sepolia — Offline')
      setIsConnected(false)
    }
  }, [abiData])

  useEffect(() => {
    checkNetworkStatus()
  }, [checkNetworkStatus])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkStatus('MetaMask not installed')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(chainId, 16) !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_HEX }],
          })
        } catch {
          setNetworkStatus('Switch to Sepolia in MetaMask')
          return
        }
      }
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      setWalletAddress(accounts[0])
      setNetworkStatus('MetaMask — Sepolia #11155111')
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
      checkGanacheStatus: checkNetworkStatus,
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
