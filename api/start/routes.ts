import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => ({ app: 'junie-api', ok: true }))

Route.post('/auth/cadastro', 'AuthController.cadastro')
Route.post('/auth/login', 'AuthController.login')
Route.get('/public/marca/:slug', 'MarcaController.publica')

Route.group(() => {
  Route.get('/auth/eu', 'AuthController.eu')
  Route.post('/auth/logout', 'AuthController.logout')

  Route.get('/marca', 'MarcaController.show')
  Route.put('/marca', 'MarcaController.update')
  Route.put('/marca/onboarding', 'MarcaController.onboarding')
  Route.post('/setup/importar', 'SetupController.importar')

  Route.resource('/categorias', 'CategoriasController').apiOnly().except(['show'])
  Route.resource('/produtos', 'ProdutosController').apiOnly()
  Route.resource('/fornecedores', 'FornecedoresController').apiOnly().except(['show'])

  Route.resource('/insumos', 'InsumosController').apiOnly()
  Route.post('/insumos/:id/movimentar', 'InsumosController.movimentar')
  Route.get('/estoque/visao', 'EstoqueController.visao')
  Route.get('/estoque/movimentacoes', 'EstoqueController.movimentacoes')
  Route.post('/estoque/inventario', 'EstoqueController.inventario')

  Route.get('/mesas', 'MesasController.index')
  Route.post('/mesas/lote', 'MesasController.lote')
  Route.get('/mesas/:id', 'MesasController.show')
  Route.put('/mesas/:id', 'MesasController.update')
  Route.delete('/mesas/:id', 'MesasController.destroy')
  Route.post('/mesas/:id/itens', 'MesasController.adicionar')
  Route.delete('/mesas/:id/itens/:itemId', 'MesasController.remover')
  Route.post('/mesas/:id/fechar', 'MesasController.fechar')

  Route.get('/cozinha', 'CozinhaController.index')
  Route.put('/cozinha/:id', 'CozinhaController.status')

  Route.get('/vendas', 'VendasController.index')
  Route.post('/vendas', 'VendasController.store')
  Route.post('/vendas/:id/cancelar', 'VendasController.cancelar')

  Route.get('/relatorios/resumo', 'RelatoriosController.resumo')
}).middleware('auth')
