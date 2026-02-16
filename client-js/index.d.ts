/**
 * HJS JavaScript Client Type Definitions
 */

declare module 'hjs-client' {
  /**
   * 记录判断时返回的简略信息
   */
  export interface JudgmentRecord {
    /** 唯一存证 ID */
    id: string
    /** 固定为 'recorded' */
    status: 'recorded'
    /** 记录时间 (ISO 8601) */
    timestamp: string
  }

  /**
   * 完整的判断记录（查询时返回）
   */
  export interface FullJudgment extends JudgmentRecord {
    /** 做出判断的主体 */
    entity: string
    /** 判断的动作 */
    action: string
    /** 附加的作用范围 */
    scope: Record<string, any>
    /** 判断发生时间（如果请求时提供了） */
    timestamp: string
    /** 记录存入数据库的时间 */
    recorded_at: string
  }

  /**
   * 客户端配置选项
   */
  export interface ClientOptions {
    /** API 基础地址，默认 https://hjs-api.onrender.com */
    baseURL?: string
  }

  /**
   * HJS API 客户端
   */
  export default class HJSClient {
    /**
     * 创建客户端实例
     * @param baseURL - API 基础地址，默认为 https://hjs-api.onrender.com
     */
    constructor(baseURL?: string)

    /**
     * 记录一次判断
     * @param entity - 做出判断的主体标识
     * @param action - 判断的动作
     * @param scope - 附加的作用范围（可选）
     * @returns 返回存证 ID 和记录时间
     * @throws 当 entity 或 action 缺失时抛出错误
     * @throws 当 API 请求失败时抛出错误
     */
    recordJudgment(
      entity: string,
      action: string,
      scope?: Record<string, any>
    ): Promise<JudgmentRecord>

    /**
     * 根据 ID 查询判断记录
     * @param id - 存证 ID
     * @returns 返回完整的判断记录
     * @throws 当 ID 不存在时抛出 404 错误
     * @throws 当 ID 缺失时抛出错误
     */
    getJudgment(id: string): Promise<FullJudgment>
  }
}