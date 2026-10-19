function describeProviderError(payload,secrets=[]){
  const error=payload?.error;
  const rawMessage=typeof error==='string'?error:error?.message||payload?.message||payload?.detail||'';
  function redact(value){
    let text=typeof value==='string'?value:'';
    for(const secret of secrets)if(secret)text=text.split(secret).join('[redacted]');
    return text.replace(/\b(?:sk|sess)-[\w-]+/g,'[redacted]').replace(/\b(?:org|proj)[_-][A-Za-z0-9]+/g,'[account]').replace(/https?:\/\/\S+/g,'[link omitted]').replace(/\s+/g,' ').slice(0,600);
  }
  const message=redact(rawMessage);
  const safeCode=value=>typeof value==='string'&&/^[a-z_]{1,80}$/i.test(value)?value:'unknown';
  const code=safeCode(redact(error?.code)),type=safeCode(redact(error?.type));
  const search=[code,type,message].join(' ').toLowerCase();
  const kind=/insufficient_quota|billing_hard_limit|exceeded your current quota|credit balance|insufficient credit|billing limit/.test(search)?'quota'
    : /rate_limit|slow_down|tokens|requests|rate limit|per minute|per day/.test(search)?'rate':'unknown';
  return {code,type,message,kind};
}
module.exports={describeProviderError};
