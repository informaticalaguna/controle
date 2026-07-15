import csv
import io

csv_data = """ID,LOCAL,NOME DA REDE,ROTEADOR,IP,SENHA WIFI,USUARIO,SENHA ACESSO,MAC LAN,MAC WAN
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
35,SECRETARIA DE TURISMO,TURISMO,HUAWEI,192.168.1.235,tur@2026,admin,info@87+,,808544B2C86B"""

f = io.StringIO(csv_data.strip())
reader = csv.reader(f)
header = next(reader)

sql_inserts = []
for row in reader:
    if not row:
        continue
    id_val = int(row[0])
    local = row[1]
    # nome_rede must not be null, so we fallback to empty string if it's empty in csv
    nome_rede = row[2] if row[2] else ""
    roteador = f"'{row[3]}'" if row[3] else "NULL"
    ip = f"'{row[4]}'" if row[4] else "NULL"
    senha_wifi = f"'{row[5]}'" if row[5] else "NULL"
    usuario = f"'{row[6]}'" if row[6] else "NULL"
    senha_acesso = f"'{row[7]}'" if row[7] else "NULL"
    mac_lan = f"'{row[8]}'" if row[8] else "NULL"
    mac_wan = f"'{row[9]}'" if row[9] else "NULL"
    
    # Escape single quotes in local, nome_rede, roteador, senha_wifi, usuario, senha_acesso
    local_esc = local.replace("'", "''")
    nome_rede_esc = nome_rede.replace("'", "''")
    if roteador != "NULL":
        roteador = f"'{row[3].replace("'", "''")}'"
    if senha_wifi != "NULL":
        senha_wifi = f"'{row[5].replace("'", "''")}'"
    if usuario != "NULL":
        usuario = f"'{row[6].replace("'", "''")}'"
    if senha_acesso != "NULL":
        senha_acesso = f"'{row[7].replace("'", "''")}'"
        
    sql = f"({id_val}, '{local_esc}', '{nome_rede_esc}', {roteador}, {ip}, {senha_wifi}, {usuario}, {senha_acesso}, {mac_lan}, {mac_wan})"
    sql_inserts.append(sql)

print("INSERT INTO public.redes_wifi (id, local, nome_rede, roteador, ip, senha_wifi, usuario, senha_acesso, mac_lan, mac_wan)")
print("VALUES")
print(",\n".join(sql_inserts) + ";")
