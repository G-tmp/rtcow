package main 

import(
	"log"
    "net/http"
    "strings"
    "github.com/gorilla/websocket"
)


var upgrader = &websocket.Upgrader{
    ReadBufferSize: 512,
    WriteBufferSize: 512,
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        if strings.Contains(origin, "127.0.0.1") {
        	return true
        }

        return false
    },
}


func serveWs(hub *hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }

    client := &client{
        send: make(chan []byte, 516),
        conn: conn,
        hub: hub,
        id: "",
    }

    client.hub.register <- client

    go client.writePump()
    go client.readPump()
}


func main() {
    hub := newHub()
    go hub.run()

    // http.Handle("/", http.FileServer(http.Dir("./web")))
    http.HandleFunc("/ws", func (w http.ResponseWriter, r *http.Request){
        serveWs(hub, w, r)
    })

    port := "12345"
    log.Printf("ws://127.0.0.1:%v/ws \n", port)
    if err := http.ListenAndServe(":" + port, nil); err != nil {
        log.Println(err)
    }
}


func init(){
    log.SetFlags(log.LstdFlags | log.Lshortfile)
}