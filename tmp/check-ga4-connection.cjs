const fs = require('node:fs');
const { GoogleAuth } = require('google-auth-library');
(async () => {
  try {
    const credentials = JSON.parse(fs.readFileSync('dokumanlar/windy-forge-507214-e7-c953c25681cd.json', 'utf8'));
    const auth = new GoogleAuth({credentials, scopes:['https://www.googleapis.com/auth/analytics.readonly']});
    const token = await auth.getAccessToken();
    const response = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/552121301:runReport', {
      method:'POST', headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'},
      signal:AbortSignal.timeout(20000),
      body:JSON.stringify({dateRanges:[{startDate:'28daysAgo',endDate:'yesterday'}],metrics:[{name:'activeUsers'},{name:'sessions'},{name:'screenPageViews'},{name:'engagementRate'}]})
    });
    const data = await response.json();
    if (!response.ok) {
      console.log(JSON.stringify({ok:false,http:response.status,status:data.error?.status,reasons:data.error?.details?.map(x=>x.reason).filter(Boolean)}));
      process.exitCode=1; return;
    }
    console.log(JSON.stringify({ok:true,property:'552121301',rowCount:data.rowCount??0,metrics:data.rows?.[0]?.metricValues?.map(x=>x.value)??[]}));
  } catch (error) {
    console.log(JSON.stringify({ok:false,code:error.code??error.cause?.code??'CONNECTION_FAILED'}));
    process.exitCode=1;
  }
})();
