import sharp from 'sharp';
const dir = process.argv[2];
for (const k of ['R','U','Y','G']) {
  const {data,info}=await sharp(`${dir}/2x/screw_head_${k}.png`).raw().toBuffer({resolveWithObject:true});
  let s=0,n=0,r=0,g=0,b=0;for(let i=0;i<data.length;i+=info.channels){if(data[i+3]>250){s+=.299*data[i]+.587*data[i+1]+.114*data[i+2];r+=data[i];g+=data[i+1];b+=data[i+2];n++}}
  console.log(k,(s/n).toFixed(0),[r/n,g/n,b/n].map(v=>v.toFixed(0)).join(','));
}
