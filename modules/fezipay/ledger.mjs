import {DatabaseSync} from 'node:sqlite';
const amount=x=>{if(typeof x!=='string'||!/^\d{1,60}$/.test(x)||BigInt(x)<=0n)throw Error('Positive integer atomic-unit string required');return BigInt(x)};
export class FeziPayLedger{
 constructor(file,{verifyTransfer}={}){this.verifyTransfer=verifyTransfer;this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,user TEXT,asset TEXT,gross TEXT,fee TEXT,net TEXT,at INTEGER);
 CREATE TABLE IF NOT EXISTS balances(user TEXT,asset TEXT,available TEXT,reserved TEXT,PRIMARY KEY(user,asset));
 CREATE TABLE IF NOT EXISTS withdrawals(id TEXT PRIMARY KEY,user TEXT,asset TEXT,units TEXT,address TEXT,state TEXT,receipt TEXT,created INTEGER);
 CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,payload TEXT,state TEXT DEFAULT 'pending');
 CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'immutable');END;
 CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'immutable');END;`)}
 balance(user,asset){return this.db.prepare('SELECT available,reserved FROM balances WHERE user=? AND asset=?').get(user,asset)||{available:'0',reserved:'0'}}
 async deposit(order,claim){if(typeof this.verifyTransfer!=='function')throw Error('Independent chain verifier not configured');
 const v=await this.verifyTransfer(order,claim);if(!v||v.final!==true||v.direction!=='deposit'||v.orderId!==order.id||v.asset!==order.asset||v.destination!==order.destination||v.network!==order.network||typeof v.eventId!=='string'||!v.eventId)throw Error('Unverified or mismatched transfer');
 const gross=amount(v.units);if(gross!==amount(order.units))throw Error('Amount mismatch requires reconciliation');
 if(!Number.isInteger(order.feeBps)||order.feeBps<0||order.feeBps>10000)throw Error('Invalid fee');
 const fee=gross*BigInt(order.feeBps)/10000n,net=gross-fee;
 this.db.exec('BEGIN IMMEDIATE');try{
 if(this.db.prepare('SELECT id FROM events WHERE id=?').get(v.eventId)){this.db.exec('COMMIT');return {duplicate:true}}
 const b=this.balance(order.user,order.asset);this.db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?)').run(v.eventId,order.user,order.asset,String(gross),String(fee),String(net),Date.now());
 this.db.prepare('INSERT INTO balances VALUES(?,?,?,?) ON CONFLICT(user,asset) DO UPDATE SET available=excluded.available').run(order.user,order.asset,String(BigInt(b.available)+net),b.reserved);
 this.db.prepare('INSERT INTO notices(id,payload) VALUES(?,?)').run(v.eventId,JSON.stringify({user:order.user,orderId:order.id,asset:order.asset,gross:String(gross),fee:String(fee),net:String(net)}));this.db.exec('COMMIT');return {gross:String(gross),fee:String(fee),net:String(net)}
 }catch(e){this.db.exec('ROLLBACK');throw e}}
 reserve({user,asset,units,address,identityVerified,clientId}){const n=amount(units);if(identityVerified!==true||!address||address.length>200||!clientId)throw Error('Verified identity, confirmed address and idempotency key required');this.db.exec('BEGIN IMMEDIATE');try{const existing=this.db.prepare('SELECT * FROM withdrawals WHERE id=?').get(clientId);if(existing){if(existing.user!==user||existing.asset!==asset||existing.units!==units||existing.address!==address)throw Error('Idempotency mismatch');this.db.exec('COMMIT');return existing}
 const b=this.balance(user,asset);if(BigInt(b.available)<n)throw Error('Insufficient funds');this.db.prepare('UPDATE balances SET available=?,reserved=? WHERE user=? AND asset=?').run(String(BigInt(b.available)-n),String(BigInt(b.reserved)+n),user,asset);this.db.prepare('INSERT INTO withdrawals VALUES(?,?,?,?,?,?,?,?)').run(clientId,user,asset,units,address,'requested',null,Date.now());this.db.exec('COMMIT');return this.db.prepare('SELECT * FROM withdrawals WHERE id=?').get(clientId)}catch(e){this.db.exec('ROLLBACK');throw e}}
 close(){this.db.close()}
}
