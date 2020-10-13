import { environment } from './environment.js'
import "https://static.opentok.com/v2/js/opentok.js"

const axios = window.axios
//import "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"

export const initServer = async () => {
    console.log(axios)
    const response = await axios.get('https://opentok-logg-test1.herokuapp.com/session')
    return response
}

export const initOTSession = async () => {
    const serverResponse = await initServer()
    const { apiKey, sessionId, token } = serverResponse.data;
    console.log('serverResponse', serverResponse)
    console.log('apiKey, sessionId, token', { apiKey, sessionId, token })
    return {
        session: OT.initSession(apiKey, sessionId),
        apiKey,
        sessionId,
        token,
    };

}