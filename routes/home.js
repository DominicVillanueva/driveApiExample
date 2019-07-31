const {
    Router
} = require('express');
const passport = require('passport');
const {
    google
} = require('googleapis');
const KEYS = require('../configs/keys');
const serviceKey = require('../resources/lisisv2-key.json');
const fs = require('fs');
// import path ° directories calls °
var path = require("path");

const router = Router()

router.get('/', function (req, res) {
    res.render('home.html', {
        'title': 'Application Home'
    });
})

router.get('/dashboard', function (req, res) {
    // if not user
    if (typeof req.user == "undefined") {
        res.redirect('/auth/login/google')
    } else {
        let parseData = {
            title: 'DASHBOARD',
            googleid: req.user._id,
            name: req.user.name,
            avatar: req.user.pic_url,
            email: req.user.email
        }

        // if redirect with google drive response
        if (req.query.file !== undefined) {
            // successfully upload
            if (req.query.file == "upload") {
                parseData.file = "uploaded"
            } else if (req.query.file == "notupload") {
                parseData.file = "notuploaded"
            }
        }
        res.render('dashboard.html', parseData)
    }
})

// URI PARA CARGAR UN ARCHIVO AL DRIVE
router.post('/upload', function (req, res) {
    // not auth
    if (!req.user) {
        res.redirect('/auth/login/google')
    } else {
        // auth user
        // config google drive with client token
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            'access_token': req.user.accessToken
        });
        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        });

        // console.log("OAUTH2 => ", oauth2Client);
        //move file to google drive
        let {
            name: filename,
            mimetype,
            data
        } = req.files.file_upload

        const driveResponse = drive.files.create({
            requestBody: {
                name: filename,
                mimeType: mimetype,
            },
            media: {
                mimeType: mimetype,
                body: Buffer.from(data).toString()
            },
            fields: 'id',
        });

        driveResponse.then(data => {
            if (data.status == 200) {
                res.redirect('/dashboard?file=upload'); // success
            } else {
                res.redirect('/dashboard?file=notupload');
            } // unsuccess
        }).catch(err => {
            throw new Error("ERROR => ", err);
        })
    }
});

// GET PARA OBTENER TODOS LOS ARCHIVOS DE UNA CARPETA ESPECIFICA
// router.get('/files', function (req, res) {
//     const drive = google.drive({
//         version: 'v3'
//     });

//     var jwtToken = new google.auth.JWT(
//         serviceKey.client_email,
//         null,
//         serviceKey.private_key, ["https://www.googleapis.com/auth/drive"],
//         null
//     );

//     console.log("TOKEN DESDE EL JSON => ", jwtToken);

//     jwtToken.authorize((authError) => {
//         if (authError) {
//             console.log("error: " + authError);
//             return;
//         } else {
//             console.log("AUTORIZACIÓN CORRECTA");
//         }
//     });

//     var folder = '1OgA88Hp-8WlRbsdq2lQWr9xtpXmiWoN3';
//     drive.files.list({
//         auth: jwtToken,
//         pageSize: 10,
//         q: "'" + folder + "' in parents and trashed=false",
//         fields: 'files(id, name)'
//     }, (err, {
//         data
//     }) => {
//         if (err) return console.log("LA API RETORNA UN ERROR: ", err);

//         console.log("DATA => ", data);

//         var files = data.files;
//         if (files.length) {
//             console.log("FILES: ");
//             files.map((file) => {
//                 console.log(`${file.name} (${file.id})`);
//             });
//         } else {
//             console.log("FILES NOT FOUND");
//         }
//     })

// });

// SUBIR ARCHIVO EN UN FOLDER ESPECIFICO. FALTA
router.post('/uploadType', function (req, res) {
    var folderId = '1OgA88Hp-8WlRbsdq2lQWr9xtpXmiWoN3';

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        'access_token': req.user.accessToken
    });
    const drive = google.drive({
        version: 'v3',
        auth: oauth2Client
    });

    var jwtToken = new google.auth.JWT(
        serviceKey.client_email,
        null,
        serviceKey.private_key, ["https://www.googleapis.com/auth/drive.file"],
        null
    );

    // console.log("TOKEN DESDE EL JSON => ", jwtToken);

    jwtToken.authorize((authError) => {
        if (authError) {
            console.log("error: " + authError);
            return;
        } else {
            console.log("AUTORIZACIÓN CORRECTA");
        }
    });

    let {
        name: filename,
        mimetype,
        data
    } = req.files.file_upload

    console.log("BUFFER TEST => ", Buffer.from(data).toString());

    const driveResponseFile = drive.files.create({
        auth: jwtToken,
        requestBody: {
            name: filename,
            mimeType: mimetype,
            parents: [folderId]
        },
        media: {
            mimeType: mimetype,
            body: Buffer.from(data).toString()
            // fs.createReadStream(path.join(__dirname, './' + `${filename}`))
            // Buffer.from(data).toString()
        },
        fields: 'id'
    });

    driveResponseFile.then(data => {

        console.log("DATA => ", data.data.id);

        if (data.status == 200) {
            res.redirect('/dashboard?file=upload'); // success
        } else {
            res.redirect('/dashboard?file=notupload');
        } // unsuccess
    }).catch(err => {
        throw new Error("ERROR => ", err);
    })

});

// DESCARGAR ARCHIVOS DESDE UN FOLDER
router.get('/files', async (req, res, next) => {
    try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            'access_token': req.user.accessToken
        });
        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        });

        var jwtToken = new google.auth.JWT(
            serviceKey.client_email,
            null,
            serviceKey.private_key, ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive.metadata.readonly"],
            null
        );

        jwtToken.authorize((authError) => {
            if (authError) {
                console.log("error: " + authError);
                return;
            } else {
                console.log("AUTORIZACIÓN CORRECTA");
            }
        });

        var folderId = '1OgA88Hp-8WlRbsdq2lQWr9xtpXmiWoN3';
        var dest = fs.createWriteStream('/test/hd.jpg');

        drive.files.get({
            auth: jwtToken,
            fileId: folderId,
            alt: 'media'
        }, {
            responseType: 'stream'
        }, function (err, res) {

            console.log("RESPONSE => ", res);
            res.data
                .on('end', function () {
                    console.log("HECHO");
                }).on('error', function (err) {
                    console.log('ERROR DURANTE LA DESCARGA', err);
                    return process.exit();
                }).pipe(dest);
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router