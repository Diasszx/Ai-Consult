import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any

DB_PATH = "erp.db"

# Catálogo Técnico Inicial (Seed Data para a tabela catalogo_pecas)
CATALOGO_TECNICO: dict[str, dict[str, str]] = {
    "AMOR-G5-01": {
        "sku": "AMOR-G5-01",
        "nome_peca": "Amortecedor Dianteiro Turbogas",
        "marca": "Cofap",
        "aplicacao": "Volkswagen Gol G5 2009 a 2012 (1.0 / 1.6), Voyage G5 2009 a 2012",
    },
    "AMOR-G5-02": {
        "sku": "AMOR-G5-02",
        "nome_peca": "Amortecedor Traseiro Turbogas",
        "marca": "Cofap",
        "aplicacao": "Volkswagen Gol G5 2009 a 2012 (1.0 / 1.6)",
    },
    "PAST-CIV-10": {
        "sku": "PAST-CIV-10",
        "nome_peca": "Jogo de Pastilhas de Freio Dianteira Cerâmica",
        "marca": "Cobreq",
        "aplicacao": "Honda Civic G10 2017 a 2021 (2.0 / 1.5 Turbo)",
    },
    "FILT-COR-15": {
        "sku": "FILT-COR-15",
        "nome_peca": "Filtro de Óleo do Motor",
        "marca": "Tecfil",
        "aplicacao": "Toyota Corolla 2015 a 2019 (1.8 / 2.0)",
    },
    "VELA-UNO-11": {
        "sku": "VELA-UNO-11",
        "nome_peca": "Jogo de Velas de Ignição Fire Evo",
        "marca": "NGK",
        "aplicacao": "Fiat Novo Uno 2010 a 2014 (1.0 / 1.4 Fire Evo)",
    },
}


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Cria as tabelas catalogo_pecas e estoque_erp e insere dados de seed (Idempotente)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS catalogo_pecas (
                sku TEXT PRIMARY KEY,
                nome_peca TEXT NOT NULL,
                marca TEXT NOT NULL,
                aplicacao TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS estoque_erp (
                sku TEXT PRIMARY KEY,
                preco REAL NOT NULL,
                quantidade INT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orcamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_nome TEXT NOT NULL,
                cliente_telefone TEXT NOT NULL,
                cliente_veiculo TEXT DEFAULT '',
                observacoes TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pendente',
                valor_total REAL NOT NULL,
                criado_em TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orcamento_itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orcamento_id INTEGER NOT NULL,
                sku TEXT NOT NULL,
                nome_peca TEXT NOT NULL,
                preco_unitario REAL NOT NULL,
                quantidade INT NOT NULL,
                subtotal REAL NOT NULL,
                FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute("SELECT COUNT(*) as total FROM catalogo_pecas")
        total_catalogo = int(cursor.fetchone()["total"])

        if total_catalogo == 0:
            seed_catalogo = [
                (
                    item["sku"],
                    item["nome_peca"],
                    item["marca"],
                    item["aplicacao"],
                )
                for item in CATALOGO_TECNICO.values()
            ]
            cursor.executemany(
                """
                INSERT OR IGNORE INTO catalogo_pecas (sku, nome_peca, marca, aplicacao)
                VALUES (?, ?, ?, ?)
                """,
                seed_catalogo,
            )

            # Seed proposital do estoque operacional:
            # AMOR-G5-01 e PAST-CIV-10 -> Com estoque
            # AMOR-G5-02 e FILT-COR-15 -> Estoque zerado (0)
            # VELA-UNO-11 -> Ausente no ERP inicial para testar conflito de cadastro
            seed_estoque = [
                ("AMOR-G5-01", 250.00, 12),
                ("AMOR-G5-02", 180.00, 0),
                ("PAST-CIV-10", 145.90, 8),
                ("FILT-COR-15", 38.50, 0),
            ]
            cursor.executemany(
                "INSERT OR IGNORE INTO estoque_erp (sku, preco, quantidade) VALUES (?, ?, ?)",
                seed_estoque,
            )

        conn.commit()


def obter_catalogo_atual() -> dict[str, dict[str, str]]:
    """Lê o catálogo técnico atualizado diretamente do banco SQLite para sincronização em tempo real com a IA."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT sku, nome_peca, marca, aplicacao FROM catalogo_pecas ORDER BY sku ASC")
            rows = cursor.fetchall()
            return {
                row["sku"]: {
                    "sku": row["sku"],
                    "nome_peca": row["nome_peca"],
                    "marca": row["marca"],
                    "aplicacao": row["aplicacao"],
                }
                for row in rows
            }
    except sqlite3.Error:
        return dict(CATALOGO_TECNICO)


def consultar_skus_no_sqlite(skus: list[str]) -> dict[str, dict[str, Any]]:
    """Busca múltiplos SKUs em uma única query parametrizada."""
    if not skus:
        return {}

    placeholders = ",".join("?" for _ in skus)
    query = f"SELECT sku, preco, quantidade FROM estoque_erp WHERE sku IN ({placeholders})"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, skus)
        rows = cursor.fetchall()
        return {row["sku"]: dict(row) for row in rows}


def _montar_item_estoque_dict(row: sqlite3.Row) -> dict[str, Any]:
    preco = float(row["preco"]) if row["preco"] is not None else None
    quantidade = int(row["quantidade"]) if row["quantidade"] is not None else None
    em_estoque = bool(quantidade is not None and quantidade > 0)
    return {
        "sku": row["sku"],
        "nome_peca": row["nome_peca"],
        "marca": row["marca"],
        "aplicacao": row["aplicacao"],
        "preco": preco,
        "quantidade": quantidade,
        "em_estoque": em_estoque,
    }


def listar_itens_estoque() -> list[dict[str, Any]]:
    """Lista todas as peças unindo catálogo técnico e saldo operacional do ERP."""
    query = """
        SELECT
            c.sku,
            c.nome_peca,
            c.marca,
            c.aplicacao,
            e.preco,
            e.quantidade
        FROM catalogo_pecas c
        LEFT JOIN estoque_erp e ON c.sku = e.sku
        ORDER BY c.sku ASC
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        return [_montar_item_estoque_dict(row) for row in rows]


def criar_item_estoque(
    sku: str,
    nome_peca: str,
    marca: str,
    aplicacao: str,
    preco: float,
    quantidade: int,
) -> dict[str, Any]:
    """Cria um novo item no catálogo e no estoque do ERP."""
    sku_norm = sku.strip().upper()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM catalogo_pecas WHERE sku = ?", (sku_norm,))
        if cursor.fetchone():
            raise ValueError(f"SKU_DUPLICADO:{sku_norm}")

        cursor.execute(
            """
            INSERT INTO catalogo_pecas (sku, nome_peca, marca, aplicacao)
            VALUES (?, ?, ?, ?)
            """,
            (sku_norm, nome_peca, marca, aplicacao),
        )
        cursor.execute(
            """
            INSERT INTO estoque_erp (sku, preco, quantidade)
            VALUES (?, ?, ?)
            """,
            (sku_norm, float(preco), int(quantidade)),
        )
        conn.commit()

    return {
        "sku": sku_norm,
        "nome_peca": nome_peca,
        "marca": marca,
        "aplicacao": aplicacao,
        "preco": float(preco),
        "quantidade": int(quantidade),
        "em_estoque": int(quantidade) > 0,
    }


def atualizar_item_estoque(
    sku: str,
    nome_peca: str,
    marca: str,
    aplicacao: str,
    preco: float,
    quantidade: int,
) -> dict[str, Any] | None:
    """Atualiza um item existente no catálogo e faz upsert no estoque_erp."""
    sku_norm = sku.strip().upper()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM catalogo_pecas WHERE sku = ?", (sku_norm,))
        if not cursor.fetchone():
            return None

        cursor.execute(
            """
            UPDATE catalogo_pecas
            SET nome_peca = ?, marca = ?, aplicacao = ?
            WHERE sku = ?
            """,
            (nome_peca, marca, aplicacao, sku_norm),
        )
        cursor.execute(
            """
            INSERT INTO estoque_erp (sku, preco, quantidade)
            VALUES (?, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET
                preco = excluded.preco,
                quantidade = excluded.quantidade
            """,
            (sku_norm, float(preco), int(quantidade)),
        )
        conn.commit()

    return {
        "sku": sku_norm,
        "nome_peca": nome_peca,
        "marca": marca,
        "aplicacao": aplicacao,
        "preco": float(preco),
        "quantidade": int(quantidade),
        "em_estoque": int(quantidade) > 0,
    }


def excluir_item_estoque(sku: str) -> bool:
    """Remove um item do estoque_erp e do catalogo_pecas."""
    sku_norm = sku.strip().upper()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM catalogo_pecas WHERE sku = ?", (sku_norm,))
        if not cursor.fetchone():
            return False

        cursor.execute("DELETE FROM estoque_erp WHERE sku = ?", (sku_norm,))
        cursor.execute("DELETE FROM catalogo_pecas WHERE sku = ?", (sku_norm,))
        conn.commit()
        return True


def _formatar_codigo_orcamento(orcamento_id: int) -> str:
    return f"ORC-{orcamento_id:04d}"


def _buscar_orcamento_por_id(conn: sqlite3.Connection, orcamento_id: int) -> dict[str, Any] | None:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, cliente_nome, cliente_telefone, cliente_veiculo, observacoes, status, valor_total, criado_em
        FROM orcamentos
        WHERE id = ?
        """,
        (orcamento_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    cursor.execute(
        """
        SELECT sku, nome_peca, preco_unitario, quantidade, subtotal
        FROM orcamento_itens
        WHERE orcamento_id = ?
        ORDER BY id ASC
        """,
        (orcamento_id,),
    )
    itens_rows = cursor.fetchall()
    itens = [
        {
            "sku": item["sku"],
            "nome_peca": item["nome_peca"],
            "preco_unitario": float(item["preco_unitario"]),
            "quantidade": int(item["quantidade"]),
            "subtotal": float(item["subtotal"]),
        }
        for item in itens_rows
    ]

    return {
        "id": int(row["id"]),
        "codigo": _formatar_codigo_orcamento(int(row["id"])),
        "cliente_nome": row["cliente_nome"],
        "cliente_telefone": row["cliente_telefone"],
        "cliente_veiculo": row["cliente_veiculo"] or "",
        "observacoes": row["observacoes"] or "",
        "status": row["status"],
        "valor_total": float(row["valor_total"]),
        "criado_em": row["criado_em"],
        "itens": itens,
    }


def criar_orcamento(
    cliente_nome: str,
    cliente_telefone: str,
    cliente_veiculo: str,
    observacoes: str,
    itens: list[dict[str, Any]],
) -> dict[str, Any]:
    """Cria e persiste um novo orçamento vinculado a um cliente e seus itens."""
    criado_em = datetime.now().strftime("%d/%m/%Y %H:%M")

    itens_processados: list[dict[str, Any]] = []
    valor_total = 0.0

    for item in itens:
        sku_norm = str(item["sku"]).strip().upper()
        preco_unit = round(float(item["preco_unitario"]), 2)
        qtd = int(item["quantidade"])
        subtotal = round(preco_unit * qtd, 2)
        valor_total = round(valor_total + subtotal, 2)
        itens_processados.append(
            {
                "sku": sku_norm,
                "nome_peca": str(item["nome_peca"]).strip(),
                "preco_unitario": preco_unit,
                "quantidade": qtd,
                "subtotal": subtotal,
            }
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO orcamentos (
                cliente_nome, cliente_telefone, cliente_veiculo, observacoes, status, valor_total, criado_em
            )
            VALUES (?, ?, ?, ?, 'pendente', ?, ?)
            """,
            (
                cliente_nome.strip(),
                cliente_telefone.strip(),
                cliente_veiculo.strip(),
                observacoes.strip(),
                valor_total,
                criado_em,
            ),
        )
        orcamento_id = int(cursor.lastrowid)

        for item in itens_processados:
            cursor.execute(
                """
                INSERT INTO orcamento_itens (
                    orcamento_id, sku, nome_peca, preco_unitario, quantidade, subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    orcamento_id,
                    item["sku"],
                    item["nome_peca"],
                    item["preco_unitario"],
                    item["quantidade"],
                    item["subtotal"],
                ),
            )
        conn.commit()
        orcamento = _buscar_orcamento_por_id(conn, orcamento_id)
        assert orcamento is not None
        return orcamento


def listar_orcamentos() -> list[dict[str, Any]]:
    """Lista todos os orçamentos salvos do mais recente para o mais antigo."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM orcamentos ORDER BY id DESC")
        ids = [int(r["id"]) for r in cursor.fetchall()]
        resultado: list[dict[str, Any]] = []
        for orc_id in ids:
            orc = _buscar_orcamento_por_id(conn, orc_id)
            if orc is not None:
                resultado.append(orc)
        return resultado


def atualizar_status_orcamento(orcamento_id: int, novo_status: str) -> dict[str, Any] | None:
    """
    Atualiza o status do orçamento.
    Se o status mudar de 'pendente' para 'aprovado', desconta automaticamente as quantidades em estoque_erp.
    Lança ValueError('SALDO_INSUFICIENTE:...') se não houver saldo suficiente para algum SKU.
    """
    with get_db_connection() as conn:
        orcamento_atual = _buscar_orcamento_por_id(conn, orcamento_id)
        if orcamento_atual is None:
            return None

        status_anterior = orcamento_atual["status"]
        cursor = conn.cursor()

        if status_anterior != "aprovado" and novo_status == "aprovado":
            # Validar saldo de todos os itens antes de deduzir
            for item in orcamento_atual["itens"]:
                sku = item["sku"]
                qtd_pedida = int(item["quantidade"])
                cursor.execute("SELECT quantidade FROM estoque_erp WHERE sku = ?", (sku,))
                row_est = cursor.fetchone()
                saldo_atual = int(row_est["quantidade"]) if row_est and row_est["quantidade"] is not None else 0
                if saldo_atual < qtd_pedida:
                    raise ValueError(
                        f"SALDO_INSUFICIENTE:Estoque insuficiente para a peça {sku} "
                        f"(necessário: {qtd_pedida}, disponível: {saldo_atual})."
                    )

            # Deduzir estoque atomicamente
            for item in orcamento_atual["itens"]:
                cursor.execute(
                    """
                    UPDATE estoque_erp
                    SET quantidade = quantidade - ?
                    WHERE sku = ?
                    """,
                    (int(item["quantidade"]), item["sku"]),
                )

        cursor.execute(
            "UPDATE orcamentos SET status = ? WHERE id = ?",
            (novo_status, orcamento_id),
        )
        conn.commit()
        return _buscar_orcamento_por_id(conn, orcamento_id)


def excluir_orcamento(orcamento_id: int) -> bool:
    """Remove um orçamento e seus itens do banco SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM orcamentos WHERE id = ?", (orcamento_id,))
        if not cursor.fetchone():
            return False

        cursor.execute("DELETE FROM orcamento_itens WHERE orcamento_id = ?", (orcamento_id,))
        cursor.execute("DELETE FROM orcamentos WHERE id = ?", (orcamento_id,))
        conn.commit()
        return True

