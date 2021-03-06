---
layout: post
title: OpenVPN server with username and password auth
---

I did this on Debian, but these instruction should work equally well for Ubuntu

### Setup IP Forwarding/Masquerading/Firewall

To turn on IP Forwarding:
```shell
# echo 1 > /proc/sys/net/ipv4/ip_forward
```

Set the change permanantly in /etc/sysctl.conf by uncommenting the line:
```
net.ipv4.ip_forward=1
```

To turn on IP Masquerading add the following IP Tables rule:
```shell
# iptables --table nat --append POSTROUTING
--out-interface eth0 --jump MASQUERADE
```

If you are running a firewall, and I strongly recommend you do on a public facing box you need to allow UDP on port 1194 into you box.
```shell
# iptables -A INPUT -udp -m udp --dport 1194 -j ACCEPT
```

But these rules need be persistant. If you don't have a mechanism for saving your firewall, can I recomend the pkg iptables-persistent.

### Setup Open VPN

#### Installing OpenVPN
Install OpenVPN package:

```shell
# aptitude install openvpn openssl
```

Edit /etc/default/openvpn. Comment all lines, and add:
```
AUTOSTART="openvpn"
```

#### Create Certificates and Keys

On you server as root:

```shell
# cd /etc/openvpn
```

Copy the the following directory
```shell
# cp -r /usr/share/doc/openvpn/examples/easy-rsa .
# cd easy-rsa/2.0/
```

Edit the file “vars”. Change the default values at the bottom of the file to match your details.

Import you ssl settings:
```shell
# . ./vars
```

run: ```# ./cleann-all```. Do not run this every time as it will remove all existing certificates.

Create your Certificate Authority

```shell
# ./build-ca
```

Give it a sensible common-name, something like: “OpenVPN CA”

Now build the key and certificate for you server

```shell
# ./build-key-server server
```

Set the common name to “server”

Answer yes to signing the certificate and commiting it.

Now let’s create Diffie Hellman parameters:

```shell
# ./build-dh
```

Most other guides now get you to generate client certs, but we are using  username and password authentication so we do not need to do this.

#### Configure OpenVPN

Edit the file /etc/openvpn/openvpn.conf and add the following (the comments are unnecessary they are just there for explanation):

```
    dev tun
    ## udp is recommended, avoid TCP over TCP
    proto udp 
    ## any port will do, this is the standard
    port 1194 

    ## certs we created earlier
    ca /etc/openvpn/easy-rsa/2.0/keys/ca.crt
    cert /etc/openvpn/easy-rsa/2.0/keys/server.crt
    key /etc/openvpn/easy-rsa/2.0/keys/server.key
    dh /etc/openvpn/easy-rsa/2.0/keys/dh1024.pem

    user nobody
    group nogroup
    ## You can make this any private subnet you like
    server 10.8.0.0 255.255.255.0

    persist-key
    persist-tun

    #status openvpn-status.log
    #verb 3
    client-to-client

    ## make this connection the default gateway for network traffic
    push "redirect-gateway def1"
    ## I am running dns_masq, you may want to put your server's DNS here
    ## or even google: 8.8.8.8
    push "dhcp-option DNS 10.8.0.1"
    
    log-append /var/log/openvpn

    ## User authentication settings. Usernames must be able to authenticate with PAM
    ## To use radius or another auth mechanism create /etc/pam.d/openvpn
    ## by default it is doing common-auth (a user must have a local accout and pasword)
    plugin /usr/lib/openvpn/openvpn-auth-pam.so login
    client-cert-not-required
    username-as-common-name

    ## A management interface allows you to telnet from local host to use
    ## telnet localhost 7505
    management localhost 7505
```

Restart OpenVPN: ```# /etc/init.d/openvpn restart```

The server is complete, still need to setup a client though.
