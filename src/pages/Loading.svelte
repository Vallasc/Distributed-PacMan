<script lang="ts">
</script>

<div class="box">
    <div class="pacman" />
    <div class="dot" />
</div>

<style>
    @-webkit-keyframes up {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(-30deg);
        }
    }
    @-moz-keyframes up {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(-30deg);
        }
    }
    @-o-keyframes up {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(-30deg);
        }
    }
    @keyframes up {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(-30deg);
        }
    }
    @-webkit-keyframes down {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(30deg);
        }
    }
    @-moz-keyframes down {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(30deg);
        }
    }
    @-o-keyframes down {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(30deg);
        }
    }
    @keyframes down {
        0%,
        100% {
            transform: rotate(0);
        }
        50% {
            transform: rotate(30deg);
        }
    }
    @-webkit-keyframes r-to-l {
        100% {
            margin-left: -1px;
        }
    }
    @-moz-keyframes r-to-l {
        100% {
            margin-left: -1px;
        }
    }
    @-o-keyframes r-to-l {
        100% {
            margin-left: -1px;
        }
    }
    @keyframes r-to-l {
        100% {
            margin-left: -1px;
        }
    }
    .box {
        position: absolute;
        background-color: #000;
        overflow: hidden;
        margin: 0;
        width: 100%;
        height: 70px;
        top: 50%;
        z-index: 10;
        border-bottom:solid 4px blue;
        border-top:solid 4px blue;
    }
    .box .pacman:before,
    .box .pacman:after {
        content: "";
        position: absolute;
        background: #ffe400;
        width: 60px;
        height: 30px;
        left: 40%;
        top: 80%;
        margin-left: -15px;
        margin-top: -50px;
        border-radius: 50px 50px 0 0;
        -webkit-animation: up 0.4s infinite;
        -moz-animation: up 0.4s infinite;
        -o-animation: up 0.4s infinite;
        animation: up 0.4s infinite;
        z-index: 12;
    }
    .box .pacman:after {
        margin-top: -22px;
        border-radius: 0 0 50px 50px;
        -webkit-animation: down 0.4s infinite;
        -moz-animation: down 0.4s infinite;
        -o-animation: down 0.4s infinite;
        animation: down 0.4s infinite;
    }

    .box .dot {
        position: absolute;
        left: 40%;
        top: 50%;
        width: 15px;
        height: 15px;
        margin-top: -7px;
        margin-left: 70px;
        border-radius: 50%;
        background: #ccc;
        box-shadow: 70px 0 0 #ccc, 140px 0 0 #ccc, 210px 0 0 #ccc, 280px 0 0 #ccc;
        -webkit-animation: r-to-l 0.4s infinite;
        -moz-animation: r-to-l 0.4s infinite;
        -o-animation: r-to-l 0.4s infinite;
        animation: r-to-l 0.4s infinite;
        z-index: 11;
    }
</style>
