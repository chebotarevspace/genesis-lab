import { expect, it } from 'vitest';
import { createSession } from './session';
import { defaults, type World } from './engine';
it('worker runs both experiments synchronously and exports / imports a complete session',()=>{
 const messages:any[]=[];const send=createSession(data=>messages.push(structuredClone(data)));send({type:'reset',seed:'test-worker',a:defaults,b:{...defaults,regeneration:0}});send({type:'step',count:20,compare:true});const state=messages.at(-1);expect((state.a as World).tick).toBe(20);expect(state.b.tick).toBe(20);send({type:'export',compare:true});const text=messages.at(-1).text;send({type:'step',count:5,compare:true});send({type:'import',text});expect(messages.at(-1)).toEqual(state);send({type:'import',text:'{}'});expect(messages.at(-1).type).toBe('error');send({type:'state'});expect(messages.at(-1)).toEqual(state);send({type:'replay'});expect(messages.at(-1)).toEqual(state);
});
