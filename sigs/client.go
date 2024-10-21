package main 

import(
	"log"
	"github.com/gorilla/websocket"
)


type client struct {
	id 		string
	conn 	*websocket.Conn
	send 	chan []byte
	hub 	*hub
}


func (c *client) readPump(){
	defer func(){
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for{
		_, m, err := c.conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return 
		}

		c.hub.broadcastE(c, m)
	}
}


func (c *client) writePump(){
	defer func(){
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
            log.Println(err)
            break
        }
	}
}