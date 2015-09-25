import React from 'react';

const KivaImage = React.createClass({
    getDefaultProps: function(){
        return {
            type : 'width'
        }
    },
    render: function(){
        //if loan={loan} is set to a valid API loan object, it knows how to get the image id
        var image_id;
        if (this.props.loan){
            image_id = this.props.loan.image.id
        } else {
            image_id = this.props.image_id
        }

        //set width if width is not defined (?)
        if (this.props.image_width && !this.props.width){
            this.props.width = this.props.image_width
        }

        //supports 'square' type else it defaults to 'width'
        var image_dir;
        if (this.props.type == 'square'){
            image_dir = `s${this.props.image_width}`
        } else {
            image_dir = `w${this.props.image_width}`
        }

        var image_url = `//s3-1.kiva.org/img/${image_dir}/${image_id}.jpg`;

        return (<img {...this.props} src={image_url} />)
    }
})

//optionally wrap it in a link?
const KivaThumbnail = React.createClass({
    render: function(){
        return (
            <KivaImage image_width={113} {...this.props}/>
        )
    }
})

export default KivaImage;