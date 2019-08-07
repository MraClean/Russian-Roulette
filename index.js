"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });

const Discord = require("discord.js");
const mongoose = require("mongoose");
const dblapi = require("dblapi.js")
const express = require("express") // For webhooks

const ConfigFile = require("./config");

const client = new Discord.Client();
const dbl = new dblapi(process.env.dblToken,client)
const app = express()

let userModel = require("./models/user")
let configModel = require("./models/guild")

let commands = [];
loadCommands(`${__dirname}/commands`);

let db = mongoose.connect(ConfigFile.config.mongodb, { useNewUrlParser: true }, () => console.log("Connected to mongodb!"));

// animeme
// ban
// banroulette
// guildinfo
// purge
// Events

client.on("ready", async () => {
    
    await client.guilds.keyArray().forEach(id => {

        configModel.findOne({
            guildId: id,
        },(err,guild) => {
            if(err) console.error(err)

            if(!guild){
                const newConfig = new configModel({
                    guildId: id,
                    prefix: ConfigFile.config.prefix
                })

                return newConfig.save()
            }
        }
        )
    })
    console.log("Logged In");
    client.user.setActivity(` ${client.users.size} users | Guilds: ${client.guilds.size}`,{ type: 'WATCHING' });

    setInterval(() => {
        dbl.postStats(client.guilds.size);
    }, 1800000)
});

client.on("message", msg => {
    configModel.findOne({
        guildId:msg.guild.id
    }, (err,guild) => {
        let prefix
        if(!guild){prefix = "rr!"}else{
            prefix = guild.prefix
            Update()
        }
        if (err){console.error(err)}

        if (msg.author.bot) {
            return;
        }
        if (!msg.member) {
            return;
        }
        if (!msg.member.user) {
            return;
        }
        if (msg.channel.type == "dm") {
            return;
        }
        userModel.findOne({
            UserId:msg.member.user.id
        }, (err,user) => {
            if (err){console.error(err)}
            if(!user) {
                const newUser = new userModel({
                    UserId: msg.member.user.id,
                    UserTag: msg.member.user.tag,
                    wins: 0,
                    draws: 0,
                    loses: 0,
                    money: 0,
                    inventory: []
                })
                return newUser.save()
            }
        })
        if (!msg.content.startsWith(prefix)) {
            return;
        }
        handleCommand(msg);
    })
});

client.on("guildMemberAdd", member => {
            userModel.findOne({
                UserId: member.id
            },(err,Amember) => {
                if(err) {console.error(err)}
    
                if(!Amember){
                    client.fetchUser(member.id).then(user => {
                        if (user.bot === true) {
                            // Making sure bots don't get put into database
                            // since bots can't play the games
                        }else{
                            const newUser = new userModel({
                                UserId: member.id,
                                UserTag: member.user.tag,
                                wins: 0,
                                draws: 0,
                                loses: 0,
                                money: 0,
                                inventory: []
                            })
            
                            return newUser.save()
                        }
                    })
                }
            }
            )
})

dbl.on('posted', () => {})
dbl.on('error', e => {
    console.log(`Oops! ${e}`);
})

app.post("/api/webhook",(req,res) => {
    let reward = 500
    let {bot,user,type,isWeekend} = req.body
    if(!bot == client.user.id){return}
    if(type == "test"){return}
    if(isWeekend){reward = reward*2}
    userModel.findOne({
        UserId:user
    }, (err,user) => {
        if (err){console.error(err)}
        if(!user) {
            let Member = client.fetchUser(user).then(member => {return member.tag})
            const newUser = new userModel({
                UserId: user,
                UserTag: Member || "Can't find",
                wins: 0,
                draws: 0,
                loses: 0,
                money: reward,
                inventory: []
            })
            return newUser.save()
        }else{
            user.money = user.money+reward
            user.save()
        }
    })
})

client.setInterval(Update,60000)// Updates Database

// Functions

function handleCommand(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        configModel.findOne({
            guildId:msg.guild.id
        }, (err,guild) => {
            if (err){console.error(err)}
            let prefix = guild.prefix
            let command = msg.content.split(" ")[0].replace(prefix, "");
            let args = msg.content.split(" ").slice(1);
            command = String(command).toLowerCase()
            for (const commandsClass of commands) {
                try {
                    if (!commandsClass.isThisCommand(command)) {
                        continue;
                    }
                    commandsClass.runCommand(args, msg, client, commands);
                }
                catch (exception) {
                    console.log(exception);
                }
            }
        })
    });
}

function loadCommands(commandsPath) {
    if (!ConfigFile.config || ConfigFile.config.commands.length === 0) {
        return;
    }
    for (const commandName of ConfigFile.config.commands) {
        const commandsClass = require(`${commandsPath}/${commandName}`).default;
        const command = new commandsClass();
        commands.push(command);
    }
}

async function Update() {
    await client.guilds.keyArray().forEach(id => {

        configModel.findOne({
            guildId: id,
        },(err,guild) => {
            if(err) console.error(err)

            if(!guild){
                const newConfig = new configModel({
                    guildId: id,
                    prefix: ConfigFile.config.prefix
                })

                return newConfig.save()
            }
        }
        )
    })
    client.user.setActivity(` ${client.users.size} users | Guilds: ${client.guilds.size}`,{ type: 'WATCHING' });
}

client.login(ConfigFile.config.token);

app.listen(process.env.PORT || 3000)
/*
let embed = new Discord.RichEmbed()
.setTitle("Usage")
.setDescription(`Ram: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}Mb /256Mb \n Cpu: ${Math.round((process.cpuUsage().system+process.cpuUsage().user) / 1000000)} Megahertz`)
msgObject.channel.send(embed)
*/
