const csvData = `ID,LOCAL,NOME DA REDE,ROTEADOR,IP,SENHA WIFI,USUARIO,SENHA ACESSO,MAC LAN,MAC WAN
3,FISCALIZAÇÃO DE OBRAS,,,192.168.1.223,info@pml,admin,info0880,,
4,CONSELHO TUTELAR,,,192.168.1.224,lagunapml,admin,info0880,,
5,CONTROLE INTERNO,,,192.168.1.225,lagunapml,admin,info0880,,
6,COMPRAS,,,192.168.1.226,laguna@pml,admin,info0880,,
7,ADM,,,192.168.1.227,lagunapml,admin,info0880,,
8,PROCURADORIA,,,192.168.1.228,procuradorpml,admin,info0880,,
9,ADM 2,,,192.168.1.229,lagunapml,admin,info0880,,
10,COMUNICACAO,,,192.168.1.230,Secom041222,admin,info0880,,
11,GABINETE,GABINETE,,192.168.1.231,gabinetelgti,admin,info87+,,
12,FLAMA,FLAMA,HUAWEI AX2,192.168.1.232,flama@2016,admin,info+87,,
13,EDUCAÇÃO,,,192.168.1.233,educacao2017,admin,info0880,,
14,PESCA,PESCA,HUAWEI PORTA DE ACESSO 443,192.168.1.234,agricultura,admin,info0880,,C0D1939D5EAD
16,GABINETE 2,GABINETE 2,huawei,192.168.1.236,gabinetelgti,admin,info87+,,
17,ASSISTENCIA SOCIAL 2,,,192.168.1.237,secretaria@2022,admin,info0880,,
18,PROTOCOLO,PROTOCOLO,INTELBRAS,192.168.1.238,laguna@pml,admin,info@87,18:0D:2C:51:1B:8F,18:0D:2C:51:1B:90
19,PROCURADORIA 2,,,192.168.1.239,procuradorpml,admin,info0880,,
20,FROTAS,,,192.168.1.240,laguna@pml,admin,info0880,,
21,AUDITÓRIO SALA DE REUNIÃO,PML_AUDITORIO,,192.168.1.241,sejabemvindo,admin,info0880,,
22,PLANEJAMENTO,SEPLAN,,192.168.1.242,seplan@2025,admin,info0880,,
23,ASSSOCIAL SECRETARIO,Assistencia Secretario,,192.168.1.243,gemeasnobre2023,admin,info0880,,
24,CONTRATOS LICITAÇÃO,CONTRATOS LICITACAO,,192.168.1.244,licitacao@pml,admin,info0880,,
25,SALA DE INFORMÁTICA,WIFI,TP-LINK,192.168.0.1,infolagunati,admin,não sei,,
26,Assistencia Social 3,Assistencia Social 3,HUAWEI,192.168.1.217,laguna@2023,admin,info87+,,
28,ASS SOCIAL 4,ASS_SOCIAL_4,HUAWEI,192.168.1.219,asssocial@4,admin,info+87,,
29,ADM3,ADM3,,192.168.1.221,adm3@pml,admin,info+87,,
30,PESCA 2 - SEC. DE PESCA 2º ANDAR,PESCA2,HUAWEI,192.168.1.220,sepagri@2024,ADMIN,Info+87,,
31,FLAMA 2,FLAMA_2,HUAWEI,192.168.1.222,flama@2025,admin,info+87,C0:D1:93:9D:60:67,C0:D1:93:9D:60:67
32,OUVIDORIA,OUVIDORIA,HUAWEI,192.168.4.1,laguna@pml,serrageral,serrageral,,
33,FISCALIZAÇÃO DE TRIBUTOS,WIFI-FISCALIZACAO,HUAWEI,192.168.1.218,Fisc@2025,admin,info+87,,
34,CULTURA - TORDESILHAS,CULTURA,HUAWEI,192.168.1.244,Laguna22025,admin,info+87,,
35,SECRETARIA DE TURISMO,TURISMO,HUAWEI,192.168.1.235,tur@2026,admin,info@87+,,808544B2C86B`;

const lines = csvData.trim().split('\n');
const header = lines[0].split(',');
const sqlInserts = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Custom splitting to respect potential quotes if needed, but none of our fields have quotes,
  // let's do a simple split by comma.
  const row = line.split(',');
  
  const idVal = parseInt(row[0], 10);
  const local = row[1];
  const nomeRede = row[2] || "";
  const roteador = row[3] ? `'${row[3].replace(/'/g, "''")}'` : 'NULL';
  const ip = row[4] ? `'${row[4].replace(/'/g, "''")}'` : 'NULL';
  const senhaWifi = row[5] ? `'${row[5].replace(/'/g, "''")}'` : 'NULL';
  const usuario = row[6] ? `'${row[6].replace(/'/g, "''")}'` : 'NULL';
  const senhaAcesso = row[7] ? `'${row[7].replace(/'/g, "''")}'` : 'NULL';
  const macLan = row[8] ? `'${row[8].replace(/'/g, "''")}'` : 'NULL';
  const macWan = row[9] ? `'${row[9].replace(/'/g, "''")}'` : 'NULL';
  
  const localEsc = local.replace(/'/g, "''");
  const nomeRedeEsc = nomeRede.replace(/'/g, "''");
  
  sqlInserts.push(`(${idVal}, '${localEsc}', '${nomeRedeEsc}', ${roteador}, ${ip}, ${senhaWifi}, ${usuario}, ${senhaAcesso}, ${macLan}, ${macWan})`);
}

console.log("INSERT INTO public.redes_wifi (id, local, nome_rede, roteador, ip, senha_wifi, usuario, senha_acesso, mac_lan, mac_wan)");
console.log("VALUES");
console.log(sqlInserts.join(',\n') + ";");
