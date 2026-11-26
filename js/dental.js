// Odontogram projection: dated findings and legacy visit snapshots stay separate from procedures.
export const DENTAL_SURFACES=['mesial','distal','bukal','lingual','oklusal','insisal'];
export const DENTAL_TOOTH_NUMBERS=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38,55,54,53,52,51,61,62,63,64,65,85,84,83,82,81,71,72,73,74,75];
export const DENTAL_CONDITIONS={sehat:'Sehat (diperiksa)',lubang:'Karies / lubang',tambal:'Restorasi / tambalan',cabut:'Hilang karena pencabutan',tanggal:'Tanggal alami',hilang:'Gigi tidak ada (sebab belum diketahui)',lain:'Kondisi lain'};
export const DENTAL_DECISIONS={belum:'Belum diputuskan',nanti:'Setuju untuk kunjungan berikutnya',tolak:'Menolak tindakan yang ditawarkan'};
const dateOf=record=>String(record?.tgl_kunjungan||'').slice(0,10);
export function dentalEvents(data,tooth,through='9999-12-31'){
  const records=(data?.records||[]).filter(r=>dateOf(r)&&dateOf(r)<=through).sort((a,b)=>dateOf(a).localeCompare(dateOf(b))||String(a.id).localeCompare(String(b.id)));
  const byId=new Map(records.map(r=>[String(r.id),r]));
  const events=[];
  records.forEach(record=>{try{const legacy=JSON.parse(record.odontogram_state||'{}')[tooth];if(legacy&&DENTAL_CONDITIONS[legacy])events.push({type:'legacy',date:dateOf(record),record_id:record.id,tooth_no:String(tooth),surface:'',condition:legacy});}catch{}});
  (data?.findings||[]).forEach(f=>{const record=byId.get(String(f.record_id));if(record&&String(f.tooth_no)===String(tooth))events.push({...f,type:'finding',date:dateOf(record)});});
  (data?.treatments||[]).forEach(t=>{const record=byId.get(String(t.record_id));if(record&&String(t.tooth_no)===String(tooth))events.push({...t,type:'treatment',date:dateOf(record)});});
  const order=event=>event.type==='legacy'?0:event.type==='treatment'?2:event.phase==='hasil'?3:1;
  return events.sort((a,b)=>a.date.localeCompare(b.date)||order(a)-order(b));
}
export function dentalCondition(data,tooth,through='9999-12-31'){
  const result={whole:'',surfaces:{},date:''};
  dentalEvents(data,tooth,through).forEach(event=>{
    if(event.type==='treatment')return;
    const condition=event.condition;
    if(!DENTAL_CONDITIONS[condition])return;
    if(event.type==='legacy'||!event.surface){result.whole=condition;result.date=event.date;if(condition==='cabut'||condition==='tanggal'||condition==='hilang')result.surfaces={};}
    else if(result.whole!=='cabut'&&result.whole!=='tanggal'&&result.whole!=='hilang'){result.surfaces[event.surface]=condition;result.date=event.date;}
  });
  return result;
}
export function dentalDisplayStatus(condition){if(['cabut','tanggal','hilang'].includes(condition.whole))return condition.whole;const values=Object.values(condition.surfaces);if(values.includes('lubang'))return'lubang';if(values.includes('tambal'))return'tambal';return condition.whole||'';}
