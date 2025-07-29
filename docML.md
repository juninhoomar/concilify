Detalhe de conciliação

Obtenha o detalhe para conciliar as faturas, os custos de venda para um período específico, o grupo de faturamento (Mercado Livre ou Mercado Pago) e o tipo de documento (Fatura ou Nota de crédito) conforme a unidade de negócio que selecione: Mercado Livre, Mercado Pago, Mercado Envíos Flex, Fulfillment e Insurtech

.
Filtros opcionais
order_by: permite ordenar a busca.
asc: ordena os resultados de forma ascendente (valor por default).
desc: ordena os resultados de forma descendente.
Ex: order_by=asc
sort_by: permite selecionar por que campo ordenar. Valores possíveis: ID (valor por default) y DATE.
detail_typepermite buscar por tipos de detalhes.
charge: traz somente cobranças.
bonus: traz somente bonificações.
Ex: detail_type=charge.
detail_sub_types: permite buscar por tipos de detalhes. Se pueden definir varios separados por comas. Se pueden definir varios separados por coma.
Ex: detail_sub_types=CV, BV
detail_excluded_sub_types: permite excluir da busca os subtipos de detalhes indicados. Podem ser definidos vários separados por vírgula.
Ex: not_subtypes=CXD, BXD
marketplace_type: permite buscar pelo market do detalhe.
Ex: marketplace_type=SHIPPING
order_ids: permite buscar por um ou vários ID de order. Disponível para Mercado Libre.
Ex: order_ids=2294412230
item_ids: permite buscar por um ou mais IDs de publicação.
Ex: item_ids=724159812
document_ids: permite buscar por um ou mais IDs de fatura.
Ex: document_ids=987046992
detail_ids: permite buscar por um ou mais IDs de detalhe.
Ex: detail_ids=724159812
offset: permite buscar desde um número de resultado em diante. O valor mínimo permitido é 0 e o valor máximo permitido é 10000. Por padrão o valor é 0. Ex: offset=100 (devolve a partir do resultado nro 100).
limit: limita a quantidade de resultados. Por padrão o mínimo é 1 e o máximo valor permitido: 1000.
Ex: limit=300 (devolve até 300 resultados).

Parâmetros de paginação
limit: limita a quantidade de resultados a obter. O valor mínimo é 1 e o valor máximo permitido é 1000. Por padrão, o valor é 150.
from_id: permite buscar a partir de um ID de detalhe específico. Esse valor é retornado no campo last_id da resposta JSON. Por padrão, o valor é 0.
Para ordenar e obter os resultados de forma correta, é necessário anexar os seguintes parâmetros na requisição:

sort_by: propriedade pela qual se deseja ordenar (ID ou DATE).
order_by: orientação da ordenação (ASC ou DESC).
Com base nesses parâmetros, é importante considerar:

A API de relatórios de faturamento permite ajustar a quantidade de resultados por página usando o parâmetro limit. Por padrão, esse valor é 150, com um máximo permitido de 1000. Isso significa que é possível aumentar o número de registros por solicitação até 1000, conforme suas necessidades.

A frequência de consumo depende do volume de dados e das necessidades específicas da sua aplicação. Se você trabalha com grandes volumes de informação, é recomendável realizar solicitações periódicas, ajustando o limit e utilizando o from_id para paginar os resultados de forma eficaz.

Por exemplo, se você deseja obter os primeiros 1000 registros, pode definir limit=1000 e from_id=0. Para a próxima página, mantenha limit=1000, utilize o from_id do resultado anterior e continue sucessivamente.

Esse método permite dividir a informação em páginas gerenciáveis e processá-la de maneira eficiente.


Exemplo detalhes de MP

Primeira página:

curl -X GET -H 'Authorization: Bearer $ACCESS_TOKEN' https://api.mercadolibre.com/billing/integration/periods/key/2024-11-01/group/MP/details?document_type=BILL&limit=1000&from_id=0
Segunda página:

curl -X GET -H 'Authorization: Bearer $ACCESS_TOKEN' https://api.mercadolibre.com/billing/integration/periods/key/2024-11-01/group/MP/details?document_type=BILL&limit=1000&from_id=12345678

Considerações
Como deve ser feita a integração para garantir que, mesmo realizando várias consultas, as informações não sejam duplicadas?

Para evitar duplicados ao realizar múltiplas consultas, é fundamental usar corretamente os parâmetros limit e from_id em cada solicitação. O parâmetro limit define a quantidade de registros a obter, enquanto from_id permite indicar um ID de detalhe específico.

Ao aumentar o limit em cada solicitação e enviar o from_id, você garante que cada página de resultados seja única e que não haja registros duplicados.


Por exemplo:

Para obter a primeira página: limit=1000 e from_id=0.
Para a segunda página: limit=1000 e from_id=last_id da solicitação anterior.
E assim sucessivamente, até consultar todos os detalhes.
Esse método garante uma paginação eficaz sem duplicados.


Nota:

Você também encontrará o parâmetro offset. Offset permite buscar a partir de um número específico de resultados. O valor mínimo permitido é 0, e o máximo é 9999. Este parâmetro é recomendado apenas para casos onde a quantidade de detalhes é menor que 10.000.


Mercado Livre
Poderá ver os valores faturados, informação de venda, descontos, envios e a publicação.

Chamada:

curl -X GET -H 'Authorization: Bearer $ACCESS_TOKEN'
https://api.mercadolibre.com/billing/integration/periods/key/$key/group/ML/details
Exemplo:

curl -X GET -H 'Authorization: Bearer $ACCESS_TOKEN'
https://api.mercadolibre.com/billing/integration/periods/key/2021-06-012/group/ML/details?document_type=BILL&limit=1
Resposta:

{
    "charge_info": {
        "legal_document_number": null,
        "legal_document_status": "PROCESSING",
        "legal_document_status_description": "Em processamento",
        "creation_date_time": "2024-11-14T10:36:38",
        "detail_id": 126303124,
        "transaction_detail": "Taxa de parcelamento (acréscimo no valor pago pelo comprador)",
        "debited_from_operation": "NO",
        "debited_from_operation_description": "Não",
        "status": null,
        "status_description": null,
        "charge_bonified_id": null,
        "detail_amount": 2.75,
        "detail_type": "CHARGE",
        "detail_sub_type": "CFONPN"
    },
    "discount_info": {
        "charge_amount_without_discount": 2.75,
        "discount_amount": 0,
        "discount_reason": null
    },
    "sales_info": [
        {
            "order_id": 2000009839350282,
            "operation_id": 93353250128,
            "sale_date_time": "2024-11-14T09:36:25",
            "sales_channel": "Mercado Livre",
            "payer_nickname": "TESTUSER1317068011",
            "state_name": null,
            "transaction_amount": 100,
            "financing_transfer_total": 102.75,
            "financing_fee": 2.75
        }
    ],
    "shipping_info": null,
    "items_info": null,
    "document_info": {
        "document_id": 3454540850
    },
    "marketplace_info": {
        "marketplace": "MP"
    },
    "currency_info": {
        "currency_id": "BRL"
    }
}
       
Campos de resposta Mercado Livre
charge_info: informação da cobrança.
legal_document_number: número do documento.
legal_document_status: estado de criação do documento. Valores possíveis: PROCESSING | PROCESSED.
legal_document_status_description: descrição internacionalizada do estado do documento legal_document_status.
creation_date_time: data de criação da cobrança.
detail_id: identificador da cobrança.
transaction_detail: detalhe da cobrança.
debited_from_operation: indica se está descontado da operação. Valores possíveis: YES | NO | INAPPLICABLE.
debited_from_operation_description: descrição internacionalizada do campo debited_from_operation.
status: estado da cobrança. Valores possíveis: BONUS_ON_CREDIT_NOTE | BONUS_PART_ON_CREDIT_NOTE | BONUS_ON_BILL | BONUS_PART_ON_BILL | BONUS_ON | BONUS_PART_ON.
status_description: descrição internacionalizada de status.
charge_bonified_id: identificador da cobrança que bonifica.
detail_amount: valor da cobrança.
detail_type: tipo de detalhe.
detail_sub_type: subtipos de detalhes.

discount_info: informação sobre descontos.
charge_amount_without_discount: valor da cobrança sem desconto.
discount_amount: valor do desconto.
discount_reason: motivo do desconto.
sales_info: informação de vendas.
applied_percentage: porcentagem que foi aplicado para calcular o valor da tarifa. (Exclusivo para Argentina)

sales_info: informação sobre a venda.
order_id: identificador da venda.
operation_id: identificador do pagamento.
sale_date_time: data e hora da venda.
sales_channel: canal de venda.
payer_nickname: cliente.
state_name: estado.
transaction_amount: valor total da venda.
financing_fee: Diferenciação no preço de acordo com a quantidade de parcelas escolhidas pelo comprador (Exclusivo para Brasil).
financing_transfer_total: valor total pago pelo cliente pelo produto (Exclusivo para Brasil)

shipping_info: informação do envio.
shipping_id: identificador do envio.
pack_id: identificador do pacote.
receiver_shipping_cost: envio a cobrança do cliente.

items_info: informação sobre publicações.
item_id: identificador da publicação.
item_kit_id: identificador do kit.
item_title: título da publicação.
Kits Virtuais: No caso de um produto pertencer a um kit, o nome do item é concatenado com Produto no Kit: nome do kit.
item_type: tipo de publicação.
item_category: categoria da publicação.
inventory_id: código de Mercado Livre.
item_amount: quantidade de itens vendidos.
item_price: preço unitário de item.
order_id: ordem à qual o item pertence.
fees_added_in_publication: Indica se a publicação oferece parcelamento. -apenas MLA-

documentInfo: informação do documento.
document_id: número Id de documentos.

marketplaceInfo: informação do marketplace.
marketplace: nome do marketplace.

currency_info: informação da moeda de acordo ao site_id.
currency_id: identificador da moeda de acordo ao site_id.

store_info: informação da filial.
store_id: identificador da filial. [Disponível apenas para MLM]
store_name: nome da filial. [Disponível apenas para MLM]

