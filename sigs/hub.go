package main 

import(
	"sync"
)


type clientSet struct {
    mu      sync.RWMutex
    numbers map[*client]struct{}
}

func (cs *clientSet) add(c *client){
    cs.mu.Lock()
    defer cs.mu.Unlock()

    cs.numbers[c] = struct{}{}
}

func (cs *clientSet) del(c *client){
    cs.mu.Lock()
    defer cs.mu.Unlock()

    delete(cs.numbers, c)
}

func (cs *clientSet) size() int {
    cs.mu.RLock()
    defer cs.mu.RUnlock()

    return len(cs.numbers)
}

func (cs *clientSet) clear(){
    cs.mu.Lock()
    defer cs.mu.Unlock()

    cs.numbers = make(map[*client]struct{})
}

func (cs *clientSet) all() []*client {
    cs.mu.RLock()
    defer cs.mu.RUnlock()

    list := make([]*client, 0, len(cs.numbers))
    for i := range cs.numbers {
        list = append(list, i)
    }

    return list
}

func (cs *clientSet) each(f func(c *client)){
    cs.mu.RLock()
    defer cs.mu.RUnlock()

    for i := range cs.numbers {
        f(i)
    }
}

type hub struct {
	clients		*clientSet
	// boradcast 	chan []byte
	register  	chan *client
	unregister  chan *client
}

func newHub() *hub {
	return &hub{
		register:  	 make(chan *client),
		unregister:  make(chan *client),
		clients:     &clientSet{
            numbers: make(map[*client]struct{}),
        },
	}
}

func (hub *hub) run(){
	for {
		select {
		case c := <-hub.register:
			hub.clients.add(c)
		case c := <-hub.unregister:
			hub.clients.del(c)
		}
	}
}

func (hub *hub) broadcastE(except *client, m []byte){
    hub.clients.each(func(c *client){
        if c != except {
            c.send <- m
        }
    })
}