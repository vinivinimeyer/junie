import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {}

  public async boot() {
    // JSON em camelCase nas respostas, igual ao que o front envia.
    const { BaseModel, SnakeCaseNamingStrategy } = await import('@ioc:Adonis/Lucid/Orm')
    class CamelCaseNamingStrategy extends SnakeCaseNamingStrategy {
      public serializedName(_model: any, propertyName: string) {
        return propertyName
      }
    }
    BaseModel.namingStrategy = new CamelCaseNamingStrategy()
  }

  public async ready() {}

  public async shutdown() {}
}
