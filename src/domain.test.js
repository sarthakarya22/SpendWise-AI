import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cents,validate,totals,suggest,fingerprint} from './domain.js';
test('money is represented as exact integer paise',()=>{assert.equal(cents('12.10')+cents('0.20'),1230);for(const s of ['0','-1','NaN','1.234','1e3','Infinity'])assert.throws(()=>cents(s))});
test('zero-income savings are unavailable and negative savings are preserved',()=>{assert.equal(totals([{type:'Expense',amount:100}]).rate,null);assert.deepEqual(totals([{type:'Income',amount:100},{type:'Expense',amount:150}]),{income:100,expense:150,balance:-50,rate:-50})});
test('invalid calendar dates, categories and amounts cannot enter the ledger',()=>{const t={name:'Coffee',amount:'12.50',type:'Expense',category:'Food',date:'2026-11-03'};assert.equal(validate(t).amount,1250);for(const change of [{date:'2026-02-30'},{category:'Unknown'},{type:'Transfer'},{name:' '},{amount:'0'}])assert.throws(()=>validate({...t,...change}))});
test('fallback recognizes documented examples without requiring the API',()=>{for(const [text,category] of [['SWIGGY ORDER','Food'],['UBER TRIP','Travel'],['NETFLIX SUBSCRIPTION','Entertainment'],['MONTHLY SALARY','Salary'],['unknown narration','Others']])assert.equal(suggest(text),category)});
test('duplicate fingerprint normalizes names but preserves amount and date',()=>{const t={name:' Coffee ',amount:1250,type:'Expense',category:'Food',date:'2026-11-03'};assert.equal(fingerprint(t),fingerprint({...t,name:'coffee'}));assert.notEqual(fingerprint(t),fingerprint({...t,amount:1251}))});
