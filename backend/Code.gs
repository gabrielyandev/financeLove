/**
 * Google Apps Script - Backend Finanças Casal (Gabriel & Sara)
 * Planilha de Persistência com Tratamento de Concorrência (LockService)
 * 
 * INSTRUÇÕES DE PUBLICAÇÃO:
 * 1. Abra sua planilha no Google Sheets (ex: crie uma em sheets.new)
 * 2. Clique em "Extensões" > "Apps Script"
 * 3. Cole este código substituindo todo o conteúdo de Code.gs
 * 4. Clique no botão azul "Implantar" (Deploy) > "Nova Implantação" (New deployment)
 * 5. Selecione o tipo "App da Web" (Web app)
 * 6. Configure:
 *    - Executar como: "Eu" (seu e-mail)
 *    - Quem tem acesso: "Qualquer pessoa" (Anyone) -> ESSENCIAL para permitir o envio do PWA sem login OAuth
 * 7. Clique em "Implantar" e autorize o acesso
 * 8. Copie a "URL do app da Web" gerada (termina com /exec) e cole no seu PWA
 */

const SHEET_NAME = 'Lançamentos';

// Cabeçalhos padrão da aba
const HEADERS = [
  'Data/Hora Registro',
  'Data da Despesa',
  'Valor (R$)',
  'Descrição',
  'Quem Pagou',
  'Tipo do Gasto',
  'Categoria',
  'Forma de Pagamento',
  'Mês/Ano'
];

/**
 * Health check via GET para testar facilmente no navegador
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'API Finanças Casal ativa e operacional!',
    timestamp: new Date().toISOString()
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Recebimento de novos lançamentos via POST
 */
function doPost(e) {
  // Obter Lock com timeout de 20s para prevenir conflito de concorrência se Gabriel e Sara salvarem juntos
  const lock = LockService.getScriptLock();
  
  try {
    const successLock = lock.tryLock(20000);
    if (!successLock) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Servidor ocupado. Tente novamente em alguns segundos.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter payload JSON (trata envio tanto de text/plain quanto application/json)
    let data;
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Payload JSON inválido: ' + err.message
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nenhum dado recebido no corpo da requisição.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Acessar ou inicializar a planilha
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Se a aba não existir, cria e formata o cabeçalho automaticamente
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupSheetHeader(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupSheetHeader(sheet);
    }

    // Tratamento dos campos
    const now = new Date();
    const tz = ss.getSpreadsheetTimeZone() || 'America/Sao_Paulo';
    const timestampFormatted = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
    
    // Data da despesa (usa a informada ou a data de hoje)
    let expenseDate = data.date ? new Date(data.date + 'T12:00:00') : now;
    if (isNaN(expenseDate.getTime())) expenseDate = now;
    const expenseDateFormatted = Utilities.formatDate(expenseDate, tz, 'dd/MM/yyyy');
    const monthYear = Utilities.formatDate(expenseDate, tz, 'MM/yyyy');

    // Valor numérico
    let numValue = 0;
    if (typeof data.valor === 'number') {
      numValue = data.valor;
    } else if (typeof data.valor === 'string') {
      // Limpa pontuações como R$ e converte vírgula para ponto
      const cleanVal = data.valor.replace(/[^0-9,\.]/g, '').replace(',', '.');
      numValue = parseFloat(cleanVal) || 0;
    }

    const row = [
      timestampFormatted,                                 // Data/Hora Registro
      expenseDateFormatted,                              // Data da Despesa
      numValue,                                          // Valor
      (data.descricao || 'Sem descrição').trim(),        // Descrição
      data.quemPagou || 'Não informado',                 // Gabriel ou Sara
      data.tipoGasto || 'Conjunto (Casal)',              // Conjunto ou Individual
      data.categoria || 'Outros',                        // Categoria
      data.formaPagamento || 'Pix',                      // Crédito, Pix, etc.
      monthYear                                          // Mês/Ano (para relatórios)
    ];

    // Inserir linha na planilha
    sheet.appendRow(row);
    
    // Formatar a coluna de Valor (coluna 3) como Moeda BRL na última linha
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 3).setNumberFormat('R$ #,##0.00');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Lançamento registrado com sucesso!',
      rowId: lastRow,
      registro: {
        valor: numValue,
        descricao: data.descricao,
        quemPagou: data.quemPagou,
        categoria: data.categoria
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    // Liberar o lock obrigatoriamente
    lock.releaseLock();
  }
}

/**
 * Criação e estilização automática do cabeçalho da planilha
 */
function setupSheetHeader(sheet) {
  sheet.appendRow(HEADERS);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  
  headerRange
    .setFontWeight('bold')
    .setBackground('#1e293b') // Slate-800
    .setFontColor('#f8fafc') // Slate-50
    .setHorizontalAlignment('center');
  
  sheet.setFrozenRows(1);

  // Formatar alinhamento das colunas
  sheet.getRange(1, 3, 1000, 1).setHorizontalAlignment('right'); // Coluna Valor
  sheet.getRange(1, 1, 1000, 2).setHorizontalAlignment('center'); // Datas
  sheet.getRange(1, 5, 1000, 5).setHorizontalAlignment('center'); // Metadados
}
