#!/usr/bin/env node
// HJS CLI 工具
// 命令行管理 HJS API

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const program = new Command();
const HJS_API_BASE = process.env.HJS_API_URL || 'https://api.hjs.sh';

// 配置文件路径
const CONFIG_PATH = path.join(os.homedir(), '.hjs', 'config.json');

// 读取配置
async function readConfig() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// 保存配置
async function saveConfig(config) {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// API 请求封装
async function hjsRequest(endpoint, options = {}) {
    const config = await readConfig();
    const url = `${HJS_API_BASE}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

program
    .name('hjs')
    .description('HJS Protocol CLI')
    .version('1.0.0');

// 登录命令
program
    .command('login')
    .description('Authenticate with HJS API')
    .option('-k, --key <apiKey>', 'API Key')
    .action(async (options) => {
        try {
            let apiKey = options.key;
            
            if (!apiKey) {
                const answers = await inquirer.prompt([{
                    type: 'input',
                    name: 'apiKey',
                    message: 'Enter your API Key:',
                    mask: '*'
                }]);
                apiKey = answers.apiKey;
            }
            
            // 验证 key
            await saveConfig({ apiKey });
            const account = await hjsRequest('/v1/account');
            
            console.log(chalk.green('✓'), `Logged in as ${account.account.name}`);
            console.log(chalk.gray('  Plan:'), account.account.plan);
            console.log(chalk.gray('  Environment:'), account.account.environment);
            
        } catch (err) {
            console.error(chalk.red('✗'), 'Login failed:', err.message);
            process.exit(1);
        }
    });

// 账户信息
program
    .command('account')
    .description('Show account information')
    .action(async () => {
        try {
            const account = await hjsRequest('/v1/account');
            
            console.log(chalk.bold('Account Information'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log('Name:        ', account.account.name);
            console.log('Plan:        ', account.account.plan);
            console.log('Environment: ', account.account.environment);
            console.log('');
            console.log(chalk.bold('Usage This Month'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log('Judgments:   ', `${account.usage.judgments} / ${account.quota.judgments}`);
            console.log('Anchors:     ', `${account.usage.anchors} / ${account.quota.anchors}`);
            console.log('API Calls:   ', `${account.usage.api_calls} / ${account.quota.api_calls}`);
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 记录 Judgment
program
    .command('record')
    .description('Record a judgment')
    .requiredOption('-e, --entity <entity>', 'Entity making the judgment')
    .requiredOption('-a, --action <action>', 'Action being judged')
    .option('-s, --scope <scope>', 'Scope data (JSON)', '{}')
    .option('--anchor', 'Anchor to blockchain', false)
    .action(async (options) => {
        try {
            const scope = JSON.parse(options.scope);
            
            const result = await hjsRequest('/v1/judgments', {
                method: 'POST',
                body: JSON.stringify({
                    entity: options.entity,
                    action: options.action,
                    scope,
                    immutability: options.anchor ? { type: 'ots' } : undefined
                })
            });
            
            console.log(chalk.green('✓'), 'Judgment recorded');
            console.log(chalk.gray('  ID:   '), result.id);
            console.log(chalk.gray('  Time: '), result.timestamp);
            
            if (options.anchor) {
                console.log(chalk.yellow('  ⏳'), 'Anchoring in progress...');
            }
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 查询记录
program
    .command('get <id>')
    .description('Get a judgment by ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (id, options) => {
        try {
            const result = await hjsRequest(`/v1/judgments/${id}`);
            
            if (options.format === 'json') {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(chalk.bold('Judgment Record'));
                console.log(chalk.gray('─'.repeat(40)));
                console.log('ID:     ', result.id);
                console.log('Entity: ', result.entity);
                console.log('Action: ', result.action);
                console.log('Time:   ', result.timestamp);
                console.log('Status: ', result.status);
                if (result.scope && Object.keys(result.scope).length > 0) {
                    console.log('Scope:  ', JSON.stringify(result.scope, null, 2));
                }
            }
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 列出记录
program
    .command('list')
    .description('List judgments')
    .option('-l, --limit <n>', 'Number of records', '20')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
        try {
            const result = await hjsRequest(`/v1/judgments?limit=${options.limit}`);
            
            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(chalk.bold(`Judgments (showing ${result.data.length} of ${result.total})`));
                console.log(chalk.gray('─'.repeat(60)));
                
                for (const item of result.data) {
                    console.log(`${chalk.cyan(item.id)} | ${item.entity} | ${item.action}`);
                    console.log(chalk.gray(`  ${item.timestamp}`));
                }
            }
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 验证记录
program
    .command('verify <id>')
    .description('Verify a record')
    .action(async (id) => {
        try {
            const result = await hjsRequest('/v1/verify', {
                method: 'POST',
                body: JSON.stringify({ id })
            });
            
            const statusColor = result.status === 'VALID' ? chalk.green : chalk.red;
            console.log(statusColor('✓'), `Verification result: ${result.status}`);
            console.log(chalk.gray('  Type:'), result.type);
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 沙盒命令组
const sandboxCmd = program
    .command('sandbox')
    .description('Sandbox environment commands');

sandboxCmd
    .command('status')
    .description('Show sandbox status')
    .action(async () => {
        try {
            const status = await hjsRequest('/sandbox/status');
            
            console.log(chalk.bold('Sandbox Status'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log('Environment:', chalk.yellow(status.environment));
            console.log('');
            console.log(chalk.bold('Quota'));
            console.log('Judgments:', status.quota.remaining.judgments, 'remaining');
            console.log('Anchors:  ', status.quota.remaining.anchors, 'remaining');
            console.log('API Calls:', status.quota.remaining.api_calls, 'remaining');
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

sandboxCmd
    .command('reset')
    .description('Reset sandbox data')
    .action(async () => {
        try {
            const answers = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: 'This will delete all sandbox data. Continue?',
                default: false
            }]);
            
            if (!answers.confirm) {
                console.log(chalk.gray('Cancelled'));
                return;
            }
            
            await hjsRequest('/sandbox/reset', { method: 'POST' });
            console.log(chalk.green('✓'), 'Sandbox reset complete');
            
        } catch (err) {
            console.error(chalk.red('✗'), err.message);
            process.exit(1);
        }
    });

// 配置显示
program
    .command('config')
    .description('Show configuration')
    .action(async () => {
        const config = await readConfig();
        console.log(chalk.bold('Configuration'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log('Config file:', CONFIG_PATH);
        console.log('API URL:    ', HJS_API_BASE);
        console.log('API Key:    ', config.apiKey ? '***' + config.apiKey.slice(-4) : 'Not set');
    });

program.parse();
