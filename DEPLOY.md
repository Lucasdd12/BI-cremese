# Guia de Deploy - BI Estratégico

Este guia explica como publicar este projeto Next.js na web usando seu próprio domínio.

## Opções de Hosting

### 1. Vercel (Recomendado para Next.js) ⭐

A Vercel é a plataforma mais fácil e otimizada para Next.js, oferecendo:
- Deploy automático a partir do Git
- Configuração de domínio personalizado gratuita
- SSL automático
- CDN global
- Preview deployments

#### Passo a Passo:

1. **Instalar Vercel CLI** (opcional, se quiser fazer deploy via terminal):
```bash
npm i -g vercel
```

2. **Criar conta na Vercel**:
   - Acesse https://vercel.com
   - Crie uma conta gratuita ou faça login

3. **Conectar repositório Git**:
   - No dashboard da Vercel, clique em "Add New Project"
   - Conecte seu repositório GitHub/GitLab/Bitbucket
   - Ou faça deploy direto com `vercel` no terminal

4. **Configurar variáveis de ambiente**:
   - No projeto na Vercel, vá em Settings > Environment Variables
   - Adicione todas as variáveis do arquivo `.env`:
     ```
     NEXT_PUBLIC_INSTANTDB_APP_ID=seu_app_id
     INSTANTDB_ADMIN_TOKEN=seu_admin_token
     ADMIN_API_TOKEN=seu_api_token
     ```

5. **Configurar domínio personalizado**:
   - Vá em Settings > Domains
   - Clique em "Add" e digite seu domínio
   - Siga as instruções para configurar DNS:
     - **Opção A (Recomendada)**: Adicione um registro CNAME apontando para `cname.vercel-dns.com`
     - **Opção B**: Adicione um registro A apontando para o IP fornecido pela Vercel

6. **Configurar DNS no seu provedor de domínio**:
   ```
   Tipo: CNAME
   Nome: @ ou www (ou o subdomínio desejado)
   Valor: cname.vercel-dns.com
   ```

7. **Aguardar propagação DNS** (pode levar até 48h, geralmente minutos)

8. **Pronto!** Seu site estará acessível em seu domínio

---

### 2. AWS (EC2, Amplify ou Lightsail)

#### AWS Amplify (Mais fácil para Next.js):

1. **Criar conta AWS**
2. **Acessar AWS Amplify Console**
3. **Conectar repositório Git**
4. **Configurar build settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. **Adicionar variáveis de ambiente**
6. **Configurar domínio personalizado**

#### AWS EC2 (VPS completo):

1. **Criar instância EC2** (Ubuntu 22.04 LTS recomendado)
2. **Conectar via SSH**
3. **Instalar Node.js e PM2**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

4. **Clonar e configurar projeto**:
```bash
git clone seu-repositorio.git
cd app
npm install
npm run build
```

5. **Configurar variáveis de ambiente**:
```bash
nano .env.local
# Cole suas variáveis de ambiente
```

6. **Iniciar com PM2**:
```bash
pm2 start npm --name "bi-estrategico" -- start
pm2 save
pm2 startup
```

7. **Instalar e configurar Nginx**:
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/bi-estrategico
```

Configuração Nginx:
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bi-estrategico /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **Configurar SSL com Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

---

### 3. Railway

Railway é uma alternativa moderna e fácil:

1. **Acesse https://railway.app**
2. **Crie conta e conecte repositório Git**
3. **Configure variáveis de ambiente**
4. **Adicione domínio personalizado no dashboard**
5. **Configure DNS apontando para Railway**

---

### 4. Render

Similar ao Railway:

1. **Acesse https://render.com**
2. **Crie Web Service**
3. **Conecte repositório Git**
4. **Configure**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. **Adicione variáveis de ambiente**
6. **Configure domínio personalizado**

---

## Configuração de Domínio (Passos Gerais)

### No seu provedor de DNS (Registro.br, GoDaddy, etc.):

1. **Acesse o painel de controle do seu domínio**
2. **Encontre a seção DNS/Zone Records**
3. **Adicione o registro conforme a plataforma escolhida**:

**Para Vercel/Railway/Render:**
```
Tipo: CNAME
Nome: @ ou www
Valor: (fornecido pela plataforma)
TTL: 3600
```

**Para AWS EC2:**
```
Tipo: A
Nome: @
Valor: IP da sua instância EC2
TTL: 3600

Tipo: CNAME
Nome: www
Valor: seu-dominio.com
TTL: 3600
```

4. **Aguarde propagação DNS** (pode levar alguns minutos até 48h)

---

## Verificações Pós-Deploy

Após o deploy, verifique:

- [ ] Site está acessível via HTTPS
- [ ] Variáveis de ambiente estão configuradas corretamente
- [ ] API routes estão funcionando
- [ ] Autenticação está funcionando
- [ ] Conexão com InstantDB está OK

---

## Comandos Úteis

### Build local para testar:
```bash
npm run build
npm start
```

### Deploy na Vercel via CLI:
```bash
vercel
vercel --prod
```

### Ver logs (Vercel):
```bash
vercel logs
```

### Ver logs (PM2 no servidor):
```bash
pm2 logs bi-estrategico
pm2 monit
```

---

## Troubleshooting

### Erro de variáveis de ambiente:
- Verifique se todas as variáveis estão configuradas na plataforma
- Certifique-se que `NEXT_PUBLIC_*` estão disponíveis no cliente

### Erro de build:
- Verifique os logs do build
- Teste localmente com `npm run build`

### Domínio não funciona:
- Aguarde propagação DNS (pode levar até 48h)
- Use ferramentas como `nslookup` ou `dig` para verificar DNS
- Verifique se o certificado SSL foi gerado

### Erro 500 ou de conexão:
- Verifique logs da aplicação
- Confirme que o InstantDB está acessível
- Verifique se as credenciais estão corretas

---

## Recomendação

**Para começar rapidamente**: Use Vercel
- Gratuito para projetos pessoais
- Setup mais fácil
- Otimizado para Next.js
- Deploy em minutos

**Para mais controle**: Use AWS EC2 ou VPS
- Controle total do servidor
- Pode ser mais econômico para alto tráfego
- Requer mais conhecimento técnico
