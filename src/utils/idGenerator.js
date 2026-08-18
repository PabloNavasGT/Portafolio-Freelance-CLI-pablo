//Genera el siguiente ID secuencial y único para cualquier colección.
export async function generateNextId(collection, prefix, padLength = 3) {
    const regex = new RegExp(`^${prefix}-\\d+$`, 'i');
    const items = await collection.find({ _id: regex }).toArray();

    let maxNum = 0;
    for (const item of items) {
        if (typeof item._id === 'string') {
            const parts = item._id.split('-');
            if (parts.length === 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
    }

    const nextNum = String(maxNum + 1).padStart(padLength, '0');
    return `${prefix.toUpperCase()}-${nextNum}`;
}