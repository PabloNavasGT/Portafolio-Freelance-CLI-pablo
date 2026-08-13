// Busca un cliente para el inicio de sesión.
class ClientRepository {

    async findByCredentials(email, password) {
        try {
            const database = db.getDB();e
            let cliente = await database.collection("clients").find({ email: email, password: password });
            return cliente;
        } catch (error) {
            console.log("hubo un error", error);
        }
    }
//insertar nuevos clientes
    async create(clientData) {
        try {
            const database = db.getDB();
            let resultado = database.collection("clients").insertOne({
                client: clientData.client,
                client: clientData.email,
                client: clientData.password,
                client: clientData.name
            });
            return resultado;
        } catch (error) {
            console.log("error al crear", error);
        }
    }
// cambiar telfono, del cliente
    async update(phone){
        try {
            const database = db.get();
            let client = {_id: client_id},
            let = {$set: {phone: phone}}  
        }catch (error) {
            console.log("error al renovar", error)
        }
    }
//enlistar todo los clientes
    async MediaRecorder(clientData){
        try{
             const database = db.getDB();
            let resultado = database.collection("clients").find()
        }catch (error) {
            console.log("error al renovar", error)
        }
    };
//eliminar cliente 
    async delete(){
        try{
            const database = db.getDB();
            let client = {_id: client_id}
            let cliente = await database.collection("clients").remove({ _id: ""})
        }catch (error) {
            console.log("error al borrar", error)
        }
    }};