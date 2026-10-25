/* eslint-disable @typescript-eslint/no-require-imports -- Isolated HTTP service double for browser tests. */
const http = require('node:http');
const { createHmac } = require('node:crypto');
const ids = { member:'11111111-1111-4111-8111-111111111111', admin:'22222222-2222-4222-8222-222222222222', reviewer:'33333333-3333-4333-8333-333333333333' };
const originalPassword = 'BrowserTest123!';
const schema = {sections:[{id:'about',title:'About you',fields:[
  {id:'motivation',type:'long_text',label:'Why would you like to join?',required:true,max_length:1000},
  {id:'areas',type:'multiple_choice',label:'Interests',required:true,options:[{value:'web',label:'Web development'},{value:'mobile',label:'Mobile development'}]},
  {id:'agreement',type:'checkbox',label:'Agreement: I will attend team meetings.',required:true},
]}]};
const opening = {id:1,slug:'sprint-mentee',title:'SPRINT mentee',eyebrow:'SPRINT PROGRAM',description:'Build with a team and mentor.',status:'open',opens_at:null,closes_at:null,form_version:1,form_schema:schema,accent:'blue',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};
function createBackend() {
  let state;
  function reset(options={}) {
    state = {profiles:{},applications:[],events:[],quotas:{},passwords:{},unexpected:[],...options};
    for (const role of Object.keys(ids)) state.profiles[ids[role]]={id:ids[role],first_name:'Browser',last_name:role,degree:'Bachelor of Science',major:'Computer Science',net_id:'abc123',personal_email:null,linkedin_url:null,github_url:null,portfolio_url:null,onboarding_completed_at:'2026-01-01T00:00:00Z'};
    if (options.submitted) state.applications=[application({submission_state:'submitted',responses:{motivation:'A synthetic application for browser review.',areas:['web'],agreement:true}})];
    if (options.offer) state.applications=[application({id:9,submission_state:'submitted',published_decision:'accepted',responses:{agreement:true},application_rsvps:{status:'awaiting_response',deadline_at:new Date(Date.now()+3600000).toISOString(),responded_at:null}})];
  }
  function user(role='member') {return {id:ids[role]??ids.member,aud:'authenticated',role:'authenticated',email:`${role}@utdallas.edu`,email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{first_name:'Browser',last_name:role},identities:[{id:ids[role]??ids.member}]};}
  function session(role) {
    const payload={sub:ids[role]??ids.member,email:`${role}@utdallas.edu`,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:'44444444-4444-4444-8444-444444444444',iss:'http://127.0.0.1:4319/auth/v1'};
    const part=(x)=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const unsigned=part({alg:'HS256',typ:'JWT'})+'.'+part(payload);
    const access_token=unsigned+'.'+createHmac('sha256','only-local-fixtures').update(unsigned).digest('base64url');
    return {access_token,refresh_token:`refresh-${role}`,token_type:'bearer',expires_in:3600,user:user(role)};
  }
  function application(values={}) {return {id:1,opening_id:1,applicant_id:ids.member,applicant_first_name:'Browser',applicant_last_name:'member',applicant_email:'member@utdallas.edu',submission_state:'draft',published_decision:'undecided',form_version:1,form_schema_snapshot:schema,responses:{},submitted_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',application_openings:opening,application_rsvps:null,...values};}
  reset();
  return http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1:4319');
    res.setHeader('Content-Type','application/json');
    res.setHeader('Access-Control-Allow-Origin','http://localhost:3100');
    res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
    if(req.method==='OPTIONS'){res.end();return;}
    const chunks=[];for await (const chunk of req)chunks.push(chunk);
    const raw=Buffer.concat(chunks).toString();
    let body;try{body=raw?JSON.parse(raw):{};}catch{body={};}
    const send=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
    const error=(message,status=400,code='test_error')=>send({message,msg:message,code,error_code:code},status);
    let role;
    try {const claims=JSON.parse(Buffer.from((req.headers.authorization??'').replace('Bearer ','').split('.')[1],'base64url'));role=Object.keys(ids).find(key=>ids[key]===claims.sub);}catch{}
    if(url.pathname==='/__reset'){reset(body);send({ok:true});return;}
    if(url.pathname==='/__state'){send(state);return;}
    if(url.pathname==='/auth/v1/token') {
      const name=(body.email??'member@utdallas.edu').split('@')[0];
      if(name==='unconfirmed'){error('Email not confirmed',400,'email_not_confirmed');return;}
      if(body.password!==(state.passwords[name]??originalPassword)){error('Invalid login credentials',400,'invalid_credentials');return;}
      send(session(name));return;
    }
    if(url.pathname==='/auth/v1/user') {
      if(!role){error('Session missing',401);return;}
      if(req.method==='PUT') {
        if(body.password===(state.passwords[role]??originalPassword)){error('New password should be different from the old password.',422,'same_password');return;}
        state.passwords[role]=body.password;
      }
      send(user(role));return;
    }
    if(url.pathname==='/auth/v1/signup'){send({user:user('member'),session:null});return;}
    if(url.pathname==='/auth/v1/verify') {
      if(body.token_hash==='browser-recovery'||body.token==='123456'){send(session('member'));return;}
      error('Token has expired or is invalid',403,'otp_expired');return;
    }
    if(url.pathname==='/auth/v1/logout'){res.statusCode=204;res.end();return;}
    if(url.pathname==='/auth/v1/resend'){send({});return;}
    if(url.pathname==='/functions/v1/request-password-reset') {
      const n=state.quotas[body.email]=(state.quotas[body.email]??0)+1;
      if(n>3){send({accepted:false,code:'RESET_LIMIT_REACHED'},429);return;}
      send({accepted:true});return;
    }
    if(url.pathname==='/functions/v1/send-application-email'){send({sent:true});return;}
    if(url.pathname.startsWith('/rest/v1/')) {
      const table=url.pathname.slice('/rest/v1/'.length);
      if(table==='rpc/is_email_blacklisted'){send(false);return;}
      if(table==='rpc/get_staff_application_page') {
        const all=Array.from({length:27},(_,i)=>application({id:i+1,submission_state:'submitted',applicant_last_name:`Applicant ${i+1}`})).filter(a=>!body.p_q||a.applicant_last_name.toLowerCase().includes(body.p_q.toLowerCase()));
        const page=body.p_page??1;
        send({applications:all.slice((page-1)*25,page*25),matched:all.length,page,pageSize:25,stagedCount:0,metrics:{total:27,awaiting:27,accepted:0,notSelected:0},rsvpSummary:{confirmed:0,awaiting:0,released:0,expired:0,readyToRelease:0}});return;
      }
      if(table==='rpc/respond_to_mentee_offer') {
        const app=state.applications.find(a=>a.id===body.target_application_id);
        if(!app||!body.agreements_confirmed){error('Agreements are required');return;}
        app.application_rsvps.status=body.response;
        send([{rsvp_status:body.response,response_recorded_at:new Date().toISOString()}]);return;
      }
      if(table==='rpc/application_email_status'){send([{id:1,template_key:'confirmation',status:'sent',attempts:1,next_attempt_at:new Date().toISOString(),last_error:null}]);return;}
      let rows=[];
      if(table==='profiles')rows=Object.values(state.profiles);
      else if(table==='application_admins')rows=['admin','reviewer'].map(r=>({user_id:ids[r],role:r,active:true}));
      else if(table==='application_openings')rows=[opening];
      else if(table==='applications')rows=state.applications;
      else if(table==='application_events')rows=state.events;
      else if(table==='application_rsvps')rows=[];
      else {state.unexpected.push(`${req.method} ${url.pathname}`);error('Unexpected fixture endpoint',500);return;}
      if(state.failProfileSave&&table==='profiles'&&req.method==='PATCH'){error('Synthetic save failure',500);return;}
      for(const [key,value]of url.searchParams){if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));}
      if(table==='applications'&&req.method==='POST'){const saved=application({...body,id:1});state.applications.push(saved);rows=[saved];}
      if(table==='application_events'&&req.method==='POST'){const event={...body,id:state.events.length+1,created_at:new Date().toISOString()};state.events.unshift(event);rows=[event];}
      if(req.method==='PATCH')for(const row of rows)Object.assign(row,body);
      const single=(req.headers.accept??'').includes('application/vnd.pgrst.object+json');
      send(single?(rows[0]??null):rows);return;
    }
    state.unexpected.push(`${req.method} ${url.pathname}`);
    error('Unexpected fixture endpoint',500);
  });
}
module.exports={createBackend};
