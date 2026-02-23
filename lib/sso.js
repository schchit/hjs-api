// HJS SSO/SAML 企业身份集成
// 支持企业用户通过现有身份提供商登录

class SSOProvider {
    constructor(pool) {
        this.pool = pool;
        this.providers = new Map();
    }
    
    // 注册SSO提供商
    async registerProvider(accountId, config) {
        const {
            type,  // 'saml' | 'oidc'
            name,
            metadata,  // SAML metadata URL/XML
            clientId,  // OIDC client ID
            clientSecret,  // OIDC client secret
            redirectUri,
            ...options
        } = config;
        
        // 验证配置
        if (type === 'saml' && !metadata) {
            throw new Error('SAML metadata is required');
        }
        if (type === 'oidc' && (!clientId || !clientSecret)) {
            throw new Error('OIDC client credentials are required');
        }
        
        const providerId = 'sso_' + Date.now() + Math.random().toString(36).substring(2, 6);
        
        await this.pool.query(
            `INSERT INTO sso_providers (
                id, account_id, type, name, metadata, 
                client_id, client_secret, redirect_uri, options
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                providerId, accountId, type, name, 
                metadata || null, clientId || null, clientSecret || null, redirectUri,
                JSON.stringify(options)
            ]
        );
        
        return {
            provider_id: providerId,
            type,
            name,
            sso_url: `/auth/sso/${providerId}`
        };
    }
    
    // 生成SAML登录请求
    async generateSAMLRequest(providerId) {
        // 使用 samlify 库生成AuthnRequest
        // 这里简化处理，实际需完整SAML实现
        const provider = await this.getProvider(providerId);
        
        const requestId = 'SAML_' + Date.now();
        
        // 构建SAML AuthnRequest XML
        const samlRequest = this.buildAuthnRequest({
            id: requestId,
            issuer: 'https://hjs.sh',
            destination: provider.sso_url,
            assertionConsumerServiceURL: `https://api.hjs.sh/auth/sso/${providerId}/callback`
        });
        
        // Base64编码并URL编码
        const encoded = Buffer.from(samlRequest).toString('base64');
        
        return {
            saml_request: encoded,
            relay_state: requestId,
            sso_url: provider.sso_url
        };
    }
    
    // 构建SAML AuthnRequest XML
    buildAuthnRequest(params) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${params.id}"
                    Version="2.0"
                    IssueInstant="${new Date().toISOString()}"
                    Destination="${params.destination}"
                    AssertionConsumerServiceURL="${params.assertionConsumerServiceURL}">
    <saml:Issuer>${params.issuer}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                        AllowCreate="true"/>
</samlp:AuthnRequest>`;
    }
    
    // 处理SAML响应
    async handleSAMLResponse(providerId, samlResponse, relayState) {
        try {
            // Base64解码
            const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');
            
            // 解析SAML Assertion
            // 实际应用中需要验证签名
            const assertion = this.parseSAMLAssertion(decoded);
            
            // 提取用户信息
            const email = assertion.attributes.find(a => a.name === 'email')?.value;
            const name = assertion.attributes.find(a => a.name === 'name')?.value;
            
            if (!email) {
                throw new Error('Email not found in SAML assertion');
            }
            
            // 查找或创建用户
            const user = await this.findOrCreateUser(providerId, email, name);
            
            // 生成会话
            const session = await this.createSession(user.id);
            
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                session_token: session.token
            };
            
        } catch (err) {
            console.error('SAML response handling error:', err);
            throw new Error('SAML authentication failed');
        }
    }
    
    // 简化解析SAML Assertion
    parseSAMLAssertion(xml) {
        // 实际应用中使用 xml2js 库
        // 这里简化处理
        return {
            attributes: [
                { name: 'email', value: this.extractValue(xml, 'email') },
                { name: 'name', value: this.extractValue(xml, 'name') }
            ]
        };
    }
    
    extractValue(xml, field) {
        const match = xml.match(new RegExp(`${field}[^>]*>([^<]+)`));
        return match ? match[1] : null;
    }
    
    // 查找或创建用户
    async findOrCreateUser(providerId, email, name) {
        // 检查是否已存在
        const existing = await this.pool.query(
            'SELECT u.* FROM users u JOIN sso_users s ON u.id = s.user_id WHERE s.provider_id = $1 AND u.email = $2',
            [providerId, email]
        );
        
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        
        // 创建新用户
        const userId = 'usr_' + Date.now();
        
        await this.pool.query(
            'INSERT INTO users (id, email, name, auth_provider) VALUES ($1, $2, $3, $4)',
            [userId, email, name, 'sso']
        );
        
        await this.pool.query(
            'INSERT INTO sso_users (user_id, provider_id, external_id) VALUES ($1, $2, $3)',
            [userId, providerId, email]
        );
        
        return { id: userId, email, name };
    }
    
    // 创建会话
    async createSession(userId) {
        const token = 'sess_' + crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时
        
        await this.pool.query(
            'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
            [token, userId, expiresAt]
        );
        
        return { token, expires_at: expiresAt };
    }
    
    // 获取提供商信息
    async getProvider(providerId) {
        const result = await this.pool.query(
            'SELECT * FROM sso_providers WHERE id = $1',
            [providerId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('SSO provider not found');
        }
        
        return result.rows[0];
    }
    
    // 列出账户的SSO提供商
    async listProviders(accountId) {
        const result = await this.pool.query(
            'SELECT id, type, name, created_at FROM sso_providers WHERE account_id = $1',
            [accountId]
        );
        
        return result.rows;
    }
    
    // 删除SSO提供商
    async deleteProvider(accountId, providerId) {
        await this.pool.query(
            'DELETE FROM sso_providers WHERE id = $1 AND account_id = $2',
            [providerId, accountId]
        );
        
        return { deleted: true };
    }
}

module.exports = { SSOProvider };
