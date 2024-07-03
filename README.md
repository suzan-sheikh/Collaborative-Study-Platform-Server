# Collaborative-Study-Platform-Server

**Live Link: [https://brainbond-e920d.web.app/](https://brainbond-e920d.web.app/)**

**Client GitHub Link: [https://github.com/suzan-sheikh/Collaborative-Study-Platform-Client](https://github.com/suzan-sheikh/Collaborative-Study-Platform-Client)**

## Prerequisites:

- Must have install Node in your local machine for run this project.
- Must have Git for clone and push from GitHub.

## Setup

For initializing this project you have to use the command below:

```sh
npm i
```

It will install all package and dependency need for your project. But it is not enough for run this project properly. You have to add a `.env` file in your root.
And the structure of the environment file are given below:

```env
DB_USER="*********"
DB_PASS="******"
Access_Token_Secret=*************************
```

Here `DB_USER` & `DB_PASS` are the username and password of MongoDB database respectivly. And `Access_Token_Secret` are the security key for your JWT Token.

If you setup this project in this way I think this project will run properly.