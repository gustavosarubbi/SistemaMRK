export interface OFXTransaction {
    trn_type: string;
    dt_posted: string; // ISO string or YYYY-MM-DD
    amount: number;
    fitid: string;
    check_num?: string;
    memo: string;
    name?: string;
}

export interface OFXData {
    bank_id: string;
    acct_id: string;
    transactions: OFXTransaction[];
    ledger_balance: number;
}

export function parseOFX(xmlString: string): OFXData {
    // Utility to extract tag content even if there's no closing tag or it's on the same line
    const extractTag = (content: string, tag: string) => {
        const regex = new RegExp(`<${tag}>([^<\\n\\r]*)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : "";
    };

    const bank_id = extractTag(xmlString, 'BANKID') || "Unknown";
    const acct_id = extractTag(xmlString, 'ACCTID') || "Unknown";
    const ledger_bal_str = extractTag(xmlString, 'BALAMT').replace(',', '.');
    const ledger_balance = ledger_bal_str ? parseFloat(ledger_bal_str) : 0;

    const transactions: OFXTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(xmlString)) !== null) {
        const trnContent = match[1];

        const trn_type = extractTag(trnContent, 'TRNTYPE');
        const rawDate = extractTag(trnContent, 'DTPOSTED').substring(0, 8);
        const amountStr = extractTag(trnContent, 'TRNAMT').replace(',', '.');
        const fitid = extractTag(trnContent, 'FITID');
        const check_num = extractTag(trnContent, 'CHECKNUM');
        const name = extractTag(trnContent, 'NAME');
        const memo = extractTag(trnContent, 'MEMO');

        let formattedDate = "";
        if (rawDate.length === 8) {
            formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        }

        // Combine Name and Memo for a full description like in the bank statement image
        const combinedMemo = [name, memo].filter(Boolean).join(' - ');

        transactions.push({
            trn_type,
            dt_posted: formattedDate,
            amount: parseFloat(amountStr) || 0,
            fitid,
            check_num: check_num || undefined,
            memo: combinedMemo,
            name: name || undefined
        });
    }

    return { bank_id, acct_id, transactions, ledger_balance };
}
