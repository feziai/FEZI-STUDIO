/** Wallet checkout display layer — NEVER settles orders or claims automatic credits. */
import wallets from './arina-wallets.json' with {type:'json'};
const CURRENCY={
 bnb:['BNB','◈','#f0b90b'], 'usdt-bep20':['USDT','₮','#26a17b'],eth:['ETH','Ξ','#6574b9'],
 'usdt-erc20':['USDT','₮','#26a17b'],btc:['BTC','₿','#f7931a'],sol:['SOL','◎','#6d57e9'],trx:['TRX','△','#e34142'],
 'usdt-trc20':['USDT','₮','#26a17b'],ton:['TON','◆','#168acd'],'usdc-base':['USDC','$','#2775ca'],
 'usdc-eth':['USDC','$','#2775ca'],'usdc-sol':['USDC','$','#2775ca'],
 'ada-cardano':['ADA','₳','#2559ce'],artibitrum:['ARB','◈','#3686d8'],base:['BASE','●','#2763f6'],
 doge:['DOGE','Ð','#b59b30'],polygon:['POL','⬡','#8247e5'],vechain:['VET','V','#52b8da'],xrp:['XRP','✕','#394355'],
 zcash:['ZEC','ⓩ','#ecb244'],bch:['BCH','₿','#8dc351'],dash:['DASH','D','#0074b9']
};
export const WALLETS=Object.freeze(wallets.map(w=>{
 const [ticker,symbol,color]=CURRENCY[w.id]||[w.id.toUpperCase(),'◆','#376ada'];
 const network=String(w.network||''),address=String(w.address||'').trim();
 const evm=/Ethereum|BNB Smart|Base|Arbitrum|Polygon/i.test(network)||['bnb','eth','base','artibitrum'].includes(w.id);
 const tron=/TRON/i.test(network),solana=/Solana/i.test(network),btc=/Bitcoin/i.test(network),cardano=/Cardano/i.test(network);
 const addressFormatValid=evm?/^0x[a-fA-F0-9]{40}$/.test(address):tron?/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address):solana?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address):btc?/^(?:bc1[ac-hj-np-z02-9]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34}|bitcoincash:[a-z0-9]{30,55})$/i.test(address):cardano?/^addr1[023456789acdefghjklmnpqrstuvwxyz]{50,110}$/i.test(address):false;
 return Object.freeze({id:w.id,label:w.label,network,address,ticker,symbol,color,addressFormatValid,qr:addressFormatValid?'/arina-gallery/qr/'+w.id+'.png':null,canAutoSettle:false});
}));
export const WALLET_APPS=Object.freeze([
 {id:'trust',name:'Trust Wallet',site:'https://trustwallet.com',supports:'WalletConnect / mobile in-app browser'},
 {id:'coinbase',name:'Coinbase Wallet',site:'https://www.coinbase.com/wallet',supports:'EVM injected provider / compatible SDK'},
 {id:'metamask',name:'MetaMask',site:'https://metamask.io',supports:'EIP-1193 / EIP-6963 / mobile app'},
 {id:'rainbow',name:'Rainbow',site:'https://rainbow.me',supports:'WalletConnect / injected provider'},
 {id:'phantom',name:'Phantom',site:'https://phantom.com',supports:'Solana / EVM wallet'},
 {id:'okx',name:'OKX Wallet',site:'https://web3.okx.com',supports:'EVM wallet / WalletConnect'},
 {id:'exodus',name:'Exodus',site:'https://www.exodus.com',supports:'Web3 wallet / WalletConnect'},
 {id:'tokenpocket',name:'TokenPocket',site:'https://www.tokenpocket.pro',supports:'In-app browser / WalletConnect'}
]);
export function createFeziWalletCheckout({env=process.env}={}){
 const readyAddress=env.FEZI_WALLET_ADDRESSES_REVIEWED==='true';
 function respond(res,obj){res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))}
 function handle(req,res,url){
  if(req.method==='GET'&&url==='/api/fezi/wallet-checkout/options'){
   respond(res,{assets:WALLETS,apps:WALLET_APPS,addressReviewed:readyAddress,paymentsEnabled:false,autoCreditEnabled:false,notice:readyAddress?'Wallet addresses configured, but settlement provider is NOT connected. Do not send funds until an invoice is explicitly verified.':'Receiver wallets have NOT been independently reviewed. QR/address display is a PREVIEW. Do not send funds.'});return true;
  }
  return false;
 }
 return {handle};
}
