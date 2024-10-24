package main 

import(
    "flag"
    "log"
)

var (
    Port int
    Certificate string
    Certificate_Key string
)


func init(){

    flag.IntVar(&Port, "p", 12345, "listening port, between 0 and 65535")
    flag.StringVar(&Certificate, "c", "" ,"CA certificate")
    flag.StringVar(&Certificate_Key, "k", "" ,"CA certificate key")
    flag.Parse()

    log.SetFlags(log.LstdFlags | log.Lshortfile)
}