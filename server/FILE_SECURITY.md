# 🔒 File Upload Security - Documentação

Sistema completo de sanitização e validação de uploads de arquivos.

## 🛡️ Proteções Implementadas

### 1. **Validação de Tipo MIME**
Apenas tipos de arquivo permitidos (whitelist):
- **Imagens**: JPEG, PNG, WebP, GIF, SVG
- **Documentos**: PDF, Word, Excel

### 2. **Validação de Extensão**
- Whitelist de extensões permitidas
- Blacklist de extensões perigosas (.exe, .bat, .php, etc.)

### 3. **Magic Bytes Verification**
Verifica os primeiros bytes do arquivo para detectar o tipo real:
- Previne upload de executáveis disfarçados de imagem
- Detecta arquivos corrompidos ou adulterados

### 4. **Path Traversal Prevention**
- Remove `..`, `/`, `\` de nomes de arquivo
- Previne acesso a diretórios fora do permitido
- Valida paths antes de operações de arquivo

### 5. **Nome de Arquivo Sanitizado**
- Remove caracteres especiais perigosos
- Gera nomes únicos com timestamp + random hash
- Limite de 255 caracteres

### 6. **Validação de Tamanho**
- Limite de 5MB por arquivo (configurável)
- Rejeita arquivos vazios
- Mensagens de erro claras com tamanhos

## 📖 Como Usar

### Upload Básico

```javascript
import { validateFileUpload } from '../middleware/fileSanitization.js'

router.post('/upload',
    upload.single('image'),
    validateFileUpload({
        allowedTypes: ['images'],
        maxSize: 5 * 1024 * 1024,
        checkMagicBytes: true,
        generateUniqueName: true
    }),
    async (req, res) => {
        const file = req.file

        // file.sanitizedName contém o nome seguro
        // file.validated = true confirma que passou validação

        res.json({ filename: file.sanitizedName })
    }
)
```

### Upload de Documentos

```javascript
router.post('/upload-doc',
    upload.single('document'),
    validateFileUpload({
        allowedTypes: ['documents'],
        maxSize: 10 * 1024 * 1024, // 10MB
    }),
    async (req, res) => {
        // Documento validado e seguro
    }
)
```

### Múltiplos Tipos

```javascript
validateFileUpload({
    allowedTypes: ['images', 'documents'],
    maxSize: 5 * 1024 * 1024
})
```

## 🔧 Funções Utilitárias

### sanitizeFileName(filename)
Remove caracteres perigosos de nomes de arquivo:

```javascript
import { sanitizeFileName } from '../middleware/fileSanitization.js'

const safe = sanitizeFileName('../../../etc/passwd')
// Resultado: 'etcpasswd'
```

### generateSafeFileName(originalName)
Gera nome único e seguro:

```javascript
import { generateSafeFileName } from '../middleware/fileSanitization.js'

const unique = generateSafeFileName('photo.jpg')
// Resultado: '1708462800000_a1b2c3d4e5f6g7h8.jpg'
```

### validateExtension(filename, allowedTypes)
Valida extensão contra whitelist/blacklist:

```javascript
import { validateExtension } from '../middleware/fileSanitization.js'

try {
    const ext = validateExtension('document.pdf', ['documents'])
    // ext = '.pdf'
} catch (error) {
    // Extensão não permitida
}
```

### validateMimeType(mimetype, allowedTypes)
Valida MIME type:

```javascript
import { validateMimeType } from '../middleware/fileSanitization.js'

try {
    validateMimeType('image/jpeg', ['images'])
    // OK
} catch (error) {
    // MIME type não permitido
}
```

### validateFileSignature(buffer, expectedMimeType)
Verifica magic bytes (assinatura do arquivo):

```javascript
import { validateFileSignature } from '../middleware/fileSanitization.js'

try {
    validateFileSignature(file.buffer, 'image/jpeg')
    // Arquivo é realmente um JPEG
} catch (error) {
    // Arquivo não corresponde ao tipo declarado
}
```

### preventPathTraversal(inputPath)
Previne ataques de path traversal:

```javascript
import { preventPathTraversal } from '../middleware/fileSanitization.js'

try {
    const safe = preventPathTraversal('../../etc/passwd')
} catch (error) {
    // Path traversal detectado
}
```

### safePathJoin(base, ...segments)
Junta paths de forma segura:

```javascript
import { safePathJoin } from '../middleware/fileSanitization.js'

const safe = safePathJoin('/uploads', 'user', 'photo.jpg')
// Resultado: '/uploads/user/photo.jpg'

// Isso falha:
safePathJoin('/uploads', '../../../etc/passwd')
// Error: Tentativa de acesso fora do diretório permitido
```

## ⚙️ Configuração

### Opções do validateFileUpload

```javascript
{
    // Tipos permitidos
    allowedTypes: ['images', 'documents'],

    // Tamanho máximo em bytes
    maxSize: 5 * 1024 * 1024, // 5MB

    // Verificar magic bytes (assinatura real)
    checkMagicBytes: true,

    // Gerar nome único automaticamente
    generateUniqueName: true
}
```

### Adicionar Novos Tipos MIME

Edite `server/middleware/fileSanitization.js`:

```javascript
const ALLOWED_MIME_TYPES = {
    images: [...],
    documents: [...],
    videos: [ // Novo tipo
        'video/mp4',
        'video/webm'
    ]
}
```

### Adicionar Novas Extensões

```javascript
const ALLOWED_EXTENSIONS = {
    images: [...],
    documents: [...],
    videos: ['.mp4', '.webm'] // Novo tipo
}
```

## 🚨 Extensões Bloqueadas (Blacklist)

Estas extensões são **sempre rejeitadas**:

```
.exe, .bat, .cmd, .com, .pif, .scr, .vbs, .js,
.jar, .zip, .rar, .7z, .tar, .gz,
.sh, .bash, .ps1, .dll, .so, .dylib,
.php, .asp, .aspx, .jsp, .cgi
```

## 🔍 Magic Bytes Suportados

| Tipo | Magic Bytes |
|------|-------------|
| JPEG | FF D8 FF |
| PNG | 89 50 4E 47 |
| GIF | 47 49 46 |
| WebP | 52 49 46 46 |
| PDF | 25 50 44 46 |

## 🎯 Exemplos de Ataques Prevenidos

### 1. Executable Disfarçado
```
❌ malware.jpg.exe → Bloqueado (extensão perigosa)
❌ virus.exe → Bloqueado (extensão perigosa)
```

### 2. Path Traversal
```
❌ ../../etc/passwd → Bloqueado
❌ ..\windows\system32 → Bloqueado
```

### 3. MIME Type Spoofing
```
❌ script.php (com MIME: image/jpeg) → Bloqueado (magic bytes não correspondem)
```

### 4. Arquivo Muito Grande
```
❌ huge_file.jpg (10MB quando limite é 5MB) → Bloqueado
```

### 5. Nome de Arquivo Malicioso
```
❌ <script>alert('xss')</script>.jpg → Sanitizado
✅ Resultado: scriptalertxssscript.jpg
```

## ✅ Melhores Práticas

1. **Sempre valide no servidor**: Nunca confie apenas em validação client-side

2. **Use nomes únicos**: Evita conflitos e facilita cache

3. **Limite tamanhos**: Previne DoS por upload massivo

4. **Verifique magic bytes**: Não confie apenas no MIME type

5. **Log tentativas suspeitas**: Monitore uploads rejeitados

6. **Armazene fora da web root**: Uploads não devem ser executáveis

7. **Use CDN/Storage externo**: S3, R2, etc.

## 📊 Logging

Erros de validação são logados automaticamente:

```
❌ Validação de arquivo falhou: Extensão perigosa detectada: .exe
❌ Validação de arquivo falhou: Arquivo muito grande: 10.5MB. Máximo: 5.0MB
❌ Validação de arquivo falhou: Arquivo não corresponde ao tipo declarado (image/jpeg)
```

## 🔐 Segurança Adicional

Para segurança adicional, considere:

1. **Scan de Malware**: Integrar com ClamAV ou VirusTotal API
2. **Rate Limiting**: Limitar uploads por IP/usuário
3. **Quarantine**: Armazenar uploads novos em quarentena antes de aprovar
4. **Content-Type Validation**: Validar headers HTTP
5. **Image Re-encoding**: Usar Sharp para reprocessar imagens

---

**Sistema protegido contra os principais vetores de ataque de upload!** 🛡️
