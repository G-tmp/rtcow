package main 

import(
	"log"
    "net/http"
    "strings"
    "strconv"
    "github.com/gorilla/websocket"
)


var upgrader = &websocket.Upgrader{
    ReadBufferSize: 512,
    WriteBufferSize: 512,
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        if strings.Contains(origin, "127.0.0.1") || strings.Contains(origin, "192.168.") {
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
    log.Println("new conn")

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

    http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request){
        w.Write([]byte("SSL warning page"))
    })
    http.HandleFunc("/ws", func (w http.ResponseWriter, r *http.Request){
        serveWs(hub, w, r)
    })

    if Certificate != "" && Certificate_Key != "" {
        log.Println("wss://127.0.0.1:" + strconv.Itoa(Port) + "/ws")
        err := http.ListenAndServeTLS(":" + strconv.Itoa(Port), Certificate, Certificate_Key, nil)
        if err != nil {
            log.Println(err)
            return
        }
    } else {
        log.Println("ws://127.0.0.1:" + strconv.Itoa(Port) + "/ws")
        err := http.ListenAndServe(":" + strconv.Itoa(Port), nil)
        if err != nil {
            log.Println(err)
            return
        }
    }
}
