import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESS_POLICY,isPaidCategory} from '../core/access-policy-v101.js';

test('FEZI core builder and creative features are free to end users',()=>{
 for(const [feature,free] of Object.entries(ACCESS_POLICY.free))assert.equal(free,true,feature);
 assert.equal(ACCESS_POLICY.otherPublicServicesPaywalled,false);
});
test('Only optional Arina and separate API key services are paid',()=>{
 assert.deepEqual(ACCESS_POLICY.publicPaidCategories,['arina_optional','api_keys','api_topup']);
 for(const cat of ['arina_optional','api_keys','api_topup'])assert.equal(isPaidCategory(cat),true);
 for(const cat of ['fezi_agent','video','image','android_export','chat','app_builder'])assert.equal(isPaidCategory(cat),false);
});
