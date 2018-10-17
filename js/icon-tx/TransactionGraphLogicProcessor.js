
class TransactionGraphLogicProcessor
{
    constructor()
    {
    }
    
    // ==== Processor =====================================================
    process (tx)
    {
        let from = tx.from;
        let to = tx.to;

        if (from) {
            from.withdraw (to, tx);
        }

        if (to) {
            to.deposit (from, tx);
        }
    }
}